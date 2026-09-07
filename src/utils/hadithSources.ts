/**
 * Hadith library catalogue and fetching.
 *
 * Data comes from the open hadith-api dataset served over the jsDelivr CDN
 * (no key, cacheable). One request downloads a whole book edition, which is
 * then stored in IndexedDB so browsing, chapters and search all work offline.
 */

const CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

export interface HadithBook {
  /** dataset id, e.g. "bukhari" */
  id: string;
  title: string;
  arabicTitle: string;
  /** language codes (3-letter dataset codes) that have a translation */
  langs: string[];
  /** rough download size per language, for the UI */
  approxMb: number;
}

export const HADITH_BOOKS: HadithBook[] = [
  { id: 'bukhari', title: 'Sahih al-Bukhari', arabicTitle: 'صحيح البخاري', langs: ['eng', 'ara', 'urd', 'ben', 'tam', 'ind', 'tur', 'fra', 'rus'], approxMb: 5 },
  { id: 'muslim', title: 'Sahih Muslim', arabicTitle: 'صحيح مسلم', langs: ['eng', 'ara', 'urd', 'ben', 'tam', 'ind', 'tur', 'fra', 'rus'], approxMb: 4 },
  { id: 'abudawud', title: "Sunan Abu Dawud", arabicTitle: 'سنن أبي داود', langs: ['eng', 'ara', 'urd', 'ben', 'ind', 'tur', 'fra', 'rus'], approxMb: 3 },
  { id: 'tirmidhi', title: 'Jami at-Tirmidhi', arabicTitle: 'جامع الترمذي', langs: ['eng', 'ara', 'urd', 'ben', 'ind', 'tur'], approxMb: 3 },
  { id: 'nasai', title: 'Sunan an-Nasai', arabicTitle: 'سنن النسائي', langs: ['eng', 'ara', 'urd', 'ben', 'ind', 'tur', 'fra'], approxMb: 3 },
  { id: 'ibnmajah', title: 'Sunan Ibn Majah', arabicTitle: 'سنن ابن ماجه', langs: ['eng', 'ara', 'urd', 'ben', 'ind', 'tur', 'fra'], approxMb: 3 },
  { id: 'malik', title: "Muwatta Malik", arabicTitle: 'موطأ مالك', langs: ['eng', 'ara', 'urd', 'ben', 'ind', 'tur', 'fra'], approxMb: 1 },
  { id: 'nawawi', title: 'Forty Hadith of an-Nawawi', arabicTitle: 'الأربعون النووية', langs: ['eng', 'ara', 'ben', 'tur', 'fra'], approxMb: 0.1 },
  { id: 'qudsi', title: 'Forty Hadith Qudsi', arabicTitle: 'الأربعون القدسية', langs: ['eng', 'ara', 'fra'], approxMb: 0.1 },
  { id: 'dehlawi', title: 'Forty Hadith of Shah Waliullah', arabicTitle: 'الأربعون للدهلوي', langs: ['eng', 'ara', 'fra'], approxMb: 0.1 },
];

/** App language code -> dataset language code. */
const LANG_MAP: Record<string, string> = {
  en: 'eng',
  ta: 'tam',
  ur: 'urd',
  bn: 'ben',
  hi: 'eng',
  ml: 'eng',
  te: 'eng',
  kn: 'eng',
  gu: 'eng',
  mr: 'eng',
  ar: 'ara',
};

export const HADITH_LANGUAGES: { code: string; label: string; rtl?: boolean }[] = [
  { code: 'eng', label: 'English' },
  { code: 'ara', label: 'العربية', rtl: true },
  { code: 'urd', label: 'اردو', rtl: true },
  { code: 'tam', label: 'தமிழ்' },
  { code: 'ben', label: 'বাংলা' },
  { code: 'ind', label: 'Indonesia' },
  { code: 'tur', label: 'Türkçe' },
  { code: 'fra', label: 'Français' },
  { code: 'rus', label: 'Русский' },
];

/** Best available dataset language for a book, given the app language. */
export function resolveHadithLang(book: HadithBook, appLanguage: string): string {
  const wanted = LANG_MAP[appLanguage] || 'eng';
  if (book.langs.includes(wanted)) return wanted;
  return book.langs.includes('eng') ? 'eng' : book.langs[0];
}

export const isRtlHadithLang = (code: string) => code === 'ara' || code === 'urd';

export interface HadithItem {
  hadithnumber: number;
  arabicnumber?: number;
  text: string;
  grades?: { name: string; grade: string }[];
  reference?: { book: number; hadith: number };
}

export interface HadithEdition {
  bookId: string;
  lang: string;
  name: string;
  /** section number -> section title */
  sections: Record<string, string>;
  hadiths: HadithItem[];
  savedAt: number;
}

export const editionName = (bookId: string, lang: string) => `${lang}-${bookId}`;

/** Downloads a whole book edition. `onProgress` receives 0..1 when the CDN reports a size. */
export async function fetchHadithEdition(
  bookId: string,
  lang: string,
  onProgress?: (ratio: number) => void,
): Promise<HadithEdition> {
  const url = `${CDN}/${editionName(bookId, lang)}.min.json`;
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Could not load this book (${res.status})`);

  let json: any;
  const total = Number(res.headers.get('content-length') || 0);
  if (onProgress && total > 0 && res.body) {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        onProgress(Math.min(1, received / total));
      }
    }
    const merged = new Uint8Array(received);
    let offset = 0;
    for (const c of chunks) { merged.set(c, offset); offset += c.length; }
    json = JSON.parse(new TextDecoder().decode(merged));
  } else {
    json = await res.json();
    onProgress?.(1);
  }

  const sectionsRaw = (json?.metadata?.sections ?? {}) as Record<string, string>;
  const sections: Record<string, string> = {};
  Object.entries(sectionsRaw).forEach(([k, v]) => {
    if (v && String(v).trim()) sections[k] = String(v);
  });

  return {
    bookId,
    lang,
    name: json?.metadata?.name ?? bookId,
    sections,
    hadiths: (json?.hadiths ?? []) as HadithItem[],
    savedAt: Date.now(),
  };
}

/** Hadiths that belong to a chapter (section) number. */
export function hadithsInSection(edition: HadithEdition, section: string): HadithItem[] {
  return edition.hadiths.filter((h) => String(h.reference?.book ?? '') === String(section));
}

export function searchHadiths(edition: HadithEdition, query: string, limit = 80): HadithItem[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const out: HadithItem[] = [];
  for (const h of edition.hadiths) {
    if (h.text?.toLowerCase().includes(q) || String(h.hadithnumber) === q) out.push(h);
    if (out.length >= limit) break;
  }
  return out;
}
