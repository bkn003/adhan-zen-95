/**
 * Human recitation recordings uploaded by the super admin.
 *
 * Each recording is one verse (Quran) or one hadith, stored in the private
 * `reciter-audio` bucket and listed in the `recitation_audio` table. When a
 * recording exists for the reader's language, it is played instead of the
 * generated/device voice.
 */
import { supabase } from '@/integrations/supabase/client';

export type RecitationKind = 'quran' | 'hadith';

export interface RecitationRow {
  id: string;
  kind: string;
  lang_code: string;
  ref1: number;
  ref2: number;
  storage_path: string;
  reciter_name: string | null;
}

const BUCKET = 'reciter-audio';
const SIGN_TTL = 60 * 60; // seconds
const CACHE_TTL_MS = 55 * 60 * 1000;

type MapEntry = { urls: Record<number, string>; expiresAt: number };
const mapCache = new Map<string, MapEntry>();
const langCache: { codes: Set<string>; expiresAt: number } = { codes: new Set(), expiresAt: 0 };

/** Rows for one reference set (e.g. all verses of a surah in one language). */
export async function listRecitations(
  kind: RecitationKind,
  langCode: string,
  ref1: number,
): Promise<RecitationRow[]> {
  const { data } = await supabase
    .from('recitation_audio')
    .select('id, kind, lang_code, ref1, ref2, storage_path, reciter_name')
    .eq('kind', kind)
    .eq('lang_code', langCode)
    .eq('ref1', ref1)
    .order('ref2', { ascending: true });
  return (data as RecitationRow[]) ?? [];
}

/** Playable URLs keyed by verse / hadith number. */
export async function getRecitationUrls(
  kind: RecitationKind,
  langCode: string,
  ref1: number,
): Promise<Record<number, string>> {
  const key = `${kind}|${langCode}|${ref1}`;
  const hit = mapCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.urls;

  const rows = await listRecitations(kind, langCode, ref1);
  if (!rows.length) {
    mapCache.set(key, { urls: {}, expiresAt: Date.now() + CACHE_TTL_MS });
    return {};
  }

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), SIGN_TTL);

  const urls: Record<number, string> = {};
  (signed ?? []).forEach((s, i) => {
    if (s?.signedUrl) urls[rows[i].ref2] = s.signedUrl;
  });
  mapCache.set(key, { urls, expiresAt: Date.now() + CACHE_TTL_MS });
  return urls;
}

/** Language codes that have at least one uploaded recording of this kind. */
export async function languagesWithRecitations(kind: RecitationKind): Promise<Set<string>> {
  if (langCache.expiresAt > Date.now()) return langCache.codes;
  const { data } = await supabase
    .from('recitation_audio')
    .select('lang_code')
    .eq('kind', kind)
    .limit(1000);
  const codes = new Set<string>((data ?? []).map((r: { lang_code: string }) => r.lang_code));
  langCache.codes = codes;
  langCache.expiresAt = Date.now() + CACHE_TTL_MS;
  return codes;
}

const clearCaches = () => {
  mapCache.clear();
  langCache.expiresAt = 0;
};

/** Super-admin upload of a single recording (replaces any existing one). */
export async function uploadRecitation(opts: {
  kind: RecitationKind;
  langCode: string;
  ref1: number;
  ref2: number;
  file: File;
  reciterName?: string;
}): Promise<void> {
  const ext = (opts.file.name.split('.').pop() || 'mp3').toLowerCase();
  const path = `${opts.kind}/${opts.langCode}/${opts.ref1}/${opts.ref2}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, opts.file, { upsert: true, contentType: opts.file.type || 'audio/mpeg' });
  if (upErr) throw new Error(upErr.message);

  const { error } = await supabase.from('recitation_audio').upsert(
    {
      kind: opts.kind,
      lang_code: opts.langCode,
      ref1: opts.ref1,
      ref2: opts.ref2,
      storage_path: path,
      reciter_name: opts.reciterName?.trim() || null,
    },
    { onConflict: 'kind,lang_code,ref1,ref2' },
  );
  if (error) throw new Error(error.message);
  clearCaches();
}

export async function deleteRecitation(row: RecitationRow): Promise<void> {
  await supabase.storage.from(BUCKET).remove([row.storage_path]);
  const { error } = await supabase.from('recitation_audio').delete().eq('id', row.id);
  if (error) throw new Error(error.message);
  clearCaches();
}
