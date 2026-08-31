import { set, get, del, keys } from 'idb-keyval';
import type { QuranAyah } from '@/utils/quranEditions';

/**
 * Offline store for the Quran reader (IndexedDB via idb-keyval).
 * Caches the surah list, Arabic text, translations and audio blobs so a
 * downloaded surah reads and recites with no network at all.
 */

const LIST_KEY = 'quran_surah_list_v1';
const TEXT_PREFIX = 'quran_text_v1_';       // + `${surah}_${editionKey}`
const AUDIO_PREFIX = 'quran_audio_v1_';     // + `${edition}_${globalAyah}`
const DL_PREFIX = 'quran_dl_v1_';           // + `${surah}_${edition}`

export interface CachedText {
  ayahs: QuranAyah[];
  savedAt: number;
}

/* ---------- surah list ---------- */

export async function saveSurahList(list: unknown): Promise<void> {
  await set(LIST_KEY, { list, savedAt: Date.now() });
}

export async function loadSurahList<T = unknown>(): Promise<T | undefined> {
  const data = await get<{ list: T; savedAt: number }>(LIST_KEY);
  return data?.list;
}

/* ---------- text (arabic / translation) ---------- */

export async function saveText(surah: number, editionKey: string, ayahs: QuranAyah[]): Promise<void> {
  await set(`${TEXT_PREFIX}${surah}_${editionKey}`, { ayahs, savedAt: Date.now() } as CachedText);
}

export async function loadText(surah: number, editionKey: string): Promise<QuranAyah[] | undefined> {
  const data = await get<CachedText>(`${TEXT_PREFIX}${surah}_${editionKey}`);
  return data?.ayahs;
}

/* ---------- audio blobs ---------- */

export async function saveAudio(edition: string, globalAyah: number, blob: Blob): Promise<void> {
  await set(`${AUDIO_PREFIX}${edition}_${globalAyah}`, blob);
}

export async function loadAudio(edition: string, globalAyah: number): Promise<Blob | undefined> {
  return get<Blob>(`${AUDIO_PREFIX}${edition}_${globalAyah}`);
}

/** Object URL for a cached ayah, or null when not downloaded. */
export async function cachedAudioUrl(edition: string, globalAyah: number): Promise<string | null> {
  const blob = await loadAudio(edition, globalAyah);
  return blob ? URL.createObjectURL(blob) : null;
}

/* ---------- download bookkeeping ---------- */

export async function markDownloaded(surah: number, edition: string): Promise<void> {
  await set(`${DL_PREFIX}${surah}_${edition}`, Date.now());
}

export async function isDownloaded(surah: number, edition: string): Promise<boolean> {
  return (await get<number>(`${DL_PREFIX}${surah}_${edition}`)) != null;
}

export async function listDownloadedSurahs(edition: string): Promise<number[]> {
  const all = await keys();
  return all
    .filter((k): k is string => typeof k === 'string' && k.startsWith(DL_PREFIX) && k.endsWith(`_${edition}`))
    .map((k) => Number(k.slice(DL_PREFIX.length).split('_')[0]))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
}

/**
 * Download a whole surah for offline use: text + every ayah's audio.
 * `onProgress` receives 0..1.
 */
export async function downloadSurahAudio(
  surah: number,
  edition: string,
  audioUrls: Record<number, string>,
  ayahs: QuranAyah[],
  onProgress?: (ratio: number) => void,
): Promise<void> {
  const total = ayahs.length || 1;
  for (let i = 0; i < ayahs.length; i++) {
    const ayah = ayahs[i];
    const url = audioUrls[ayah.numberInSurah];
    if (url && !(await loadAudio(edition, ayah.number))) {
      try {
        const res = await fetch(url);
        if (res.ok) await saveAudio(edition, ayah.number, await res.blob());
      } catch {
        /* skip a failed ayah; the rest still cache */
      }
    }
    onProgress?.((i + 1) / total);
  }
  await markDownloaded(surah, edition);
}

/** Remove a downloaded surah's audio + download marker. */
export async function removeDownload(surah: number, edition: string, ayahs: QuranAyah[]): Promise<void> {
  for (const a of ayahs) await del(`${AUDIO_PREFIX}${edition}_${a.number}`);
  await del(`${DL_PREFIX}${surah}_${edition}`);
}

/** Approximate size of everything the Quran reader has cached, in bytes. */
export async function estimateCacheSize(): Promise<number> {
  const all = await keys();
  let bytes = 0;
  for (const k of all) {
    if (typeof k !== 'string') continue;
    if (!k.startsWith(AUDIO_PREFIX) && !k.startsWith(TEXT_PREFIX)) continue;
    const v = await get(k);
    if (v instanceof Blob) bytes += v.size;
    else if (v) bytes += JSON.stringify(v).length;
  }
  return bytes;
}

export async function clearQuranCache(): Promise<void> {
  const all = await keys();
  for (const k of all) {
    if (typeof k !== 'string') continue;
    if (k.startsWith(AUDIO_PREFIX) || k.startsWith(TEXT_PREFIX) || k.startsWith(DL_PREFIX) || k === LIST_KEY) {
      await del(k);
    }
  }
}
