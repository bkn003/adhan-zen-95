import { set, get, del, keys } from 'idb-keyval';
import type { HadithEdition } from '@/utils/hadithSources';
import { editionName } from '@/utils/hadithSources';

/** Offline store for the hadith library (IndexedDB via idb-keyval). */

const ED_PREFIX = 'hadith_edition_v1_';
const BOOKMARKS_KEY = 'hadith_bookmarks_v1';

export interface HadithBookmark {
  bookId: string;
  lang: string;
  hadithnumber: number;
  text: string;
  savedAt: number;
}

export async function saveEdition(edition: HadithEdition): Promise<void> {
  await set(`${ED_PREFIX}${editionName(edition.bookId, edition.lang)}`, edition);
}

export async function loadEdition(bookId: string, lang: string): Promise<HadithEdition | undefined> {
  return get<HadithEdition>(`${ED_PREFIX}${editionName(bookId, lang)}`);
}

export async function removeEdition(bookId: string, lang: string): Promise<void> {
  await del(`${ED_PREFIX}${editionName(bookId, lang)}`);
}

/** Editions already downloaded, as `${lang}-${bookId}` names. */
export async function listDownloadedEditions(): Promise<string[]> {
  const all = await keys();
  return all
    .filter((k): k is string => typeof k === 'string' && k.startsWith(ED_PREFIX))
    .map((k) => k.slice(ED_PREFIX.length));
}

/* ---------- bookmarks ---------- */

export async function loadHadithBookmarks(): Promise<HadithBookmark[]> {
  return (await get<HadithBookmark[]>(BOOKMARKS_KEY)) ?? [];
}

export async function toggleHadithBookmark(b: Omit<HadithBookmark, 'savedAt'>): Promise<HadithBookmark[]> {
  const list = await loadHadithBookmarks();
  const idx = list.findIndex(
    (x) => x.bookId === b.bookId && x.lang === b.lang && x.hadithnumber === b.hadithnumber,
  );
  const next = idx >= 0
    ? list.filter((_, i) => i !== idx)
    : [{ ...b, savedAt: Date.now() }, ...list];
  await set(BOOKMARKS_KEY, next);
  return next;
}
