/**
 * Quran translation + recitation catalogue.
 *
 * Every language offered in app Settings has a readable translation here, and
 * every one of them can be *recited* aloud:
 *   - `audioEdition` → a real human-voice translation recitation (Arabic,
 *     English, Urdu) streamed from the alquran.cloud CDN and cacheable offline.
 *   - otherwise the device's speech engine reads the translation using
 *     `ttsLang` (Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, Gujarati,
 *     Marathi …), so recitation is available in every language.
 */

export interface QuranAyah {
  number: number; // global ayah number (used for Arabic audio)
  numberInSurah: number;
  text: string;
}

export interface QuranLanguage {
  /** Matches the app language codes where possible. */
  code: string;
  label: string;
  englishLabel: string;
  rtl?: boolean;
  /** BCP-47 tag used for device speech synthesis. */
  ttsLang: string;
  /** alquran.cloud text edition id. */
  cloudEdition?: string;
  /** quran.com translation resource id (used when alquran.cloud has none). */
  quranComId?: number;
  /** alquran.cloud audio edition with a human voice for this language. */
  audioEdition?: string;
}

export const QURAN_LANGUAGES: QuranLanguage[] = [
  { code: 'en', label: 'English', englishLabel: 'English', ttsLang: 'en-US', cloudEdition: 'en.sahih', audioEdition: 'en.walk' },
  { code: 'ta', label: 'தமிழ்', englishLabel: 'Tamil', ttsLang: 'ta-IN', cloudEdition: 'ta.tamil' },
  { code: 'hi', label: 'हिन्दी', englishLabel: 'Hindi', ttsLang: 'hi-IN', cloudEdition: 'hi.hindi' },
  { code: 'ur', label: 'اردو', englishLabel: 'Urdu', rtl: true, ttsLang: 'ur-PK', cloudEdition: 'ur.jalandhry', audioEdition: 'ur.khan' },
  { code: 'ml', label: 'മലയാളം', englishLabel: 'Malayalam', ttsLang: 'ml-IN', cloudEdition: 'ml.abdulhameed' },
  { code: 'bn', label: 'বাংলা', englishLabel: 'Bengali', ttsLang: 'bn-IN', cloudEdition: 'bn.bengali' },
  { code: 'te', label: 'తెలుగు', englishLabel: 'Telugu', ttsLang: 'te-IN', quranComId: 227 },
  { code: 'kn', label: 'ಕನ್ನಡ', englishLabel: 'Kannada', ttsLang: 'kn-IN', quranComId: 771 },
  { code: 'gu', label: 'ગુજરાતી', englishLabel: 'Gujarati', ttsLang: 'gu-IN', quranComId: 225 },
  { code: 'mr', label: 'मराठी', englishLabel: 'Marathi', ttsLang: 'mr-IN', quranComId: 226 },
];

export const getQuranLanguage = (code: string): QuranLanguage =>
  QURAN_LANGUAGES.find((l) => l.code === code) || QURAN_LANGUAGES[0];

/** Arabic reciters available for the Arabic recitation mode. */
export const ARABIC_RECITERS: { id: string; label: string }[] = [
  { id: 'ar.alafasy', label: 'Mishary Alafasy' },
  { id: 'ar.husary', label: 'Al-Husary' },
  { id: 'ar.abdulbasitmurattal', label: 'Abdul Basit' },
  { id: 'ar.mahermuaiqly', label: 'Maher Al Muaiqly' },
  { id: 'ar.minshawi', label: 'Al-Minshawi' },
];

const stripHtml = (s: string) =>
  s.replace(/<sup[^>]*>.*?<\/sup>/gs, '').replace(/<[^>]+>/g, '').trim();

/** Arabic (Uthmani) text of a surah. */
export async function fetchArabicSurah(surah: number): Promise<QuranAyah[]> {
  const res = await fetch(`https://api.alquran.cloud/v1/surah/${surah}/quran-uthmani`, { cache: 'force-cache' });
  const json = await res.json();
  return (json?.data?.ayahs ?? []).map((a: any) => ({
    number: a.number,
    numberInSurah: a.numberInSurah,
    text: a.text,
  }));
}

/** Translation text of a surah in the requested language. */
export async function fetchTranslationSurah(surah: number, lang: QuranLanguage): Promise<QuranAyah[]> {
  if (lang.cloudEdition) {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${surah}/${lang.cloudEdition}`, { cache: 'force-cache' });
    const json = await res.json();
    return (json?.data?.ayahs ?? []).map((a: any) => ({
      number: a.number,
      numberInSurah: a.numberInSurah,
      text: stripHtml(String(a.text ?? '')),
    }));
  }

  const res = await fetch(
    `https://api.quran.com/api/v4/verses/by_chapter/${surah}?translations=${lang.quranComId}&per_page=300`,
    { cache: 'force-cache' },
  );
  const json = await res.json();
  return (json?.verses ?? []).map((v: any, i: number) => ({
    number: v.id,
    numberInSurah: v.verse_number ?? i + 1,
    text: stripHtml(String(v.translations?.[0]?.text ?? '')),
  }));
}

/** Per-ayah audio URLs for a voiced edition (Arabic reciter or translation voice). */
export async function fetchAudioUrls(surah: number, edition: string): Promise<Record<number, string>> {
  const res = await fetch(`https://api.alquran.cloud/v1/surah/${surah}/${edition}`, { cache: 'force-cache' });
  const json = await res.json();
  const map: Record<number, string> = {};
  (json?.data?.ayahs ?? []).forEach((a: any) => {
    if (a.audio) map[a.numberInSurah] = a.audio;
  });
  return map;
}

/** Does the device have a voice that can read this language aloud? */
export function hasVoiceFor(ttsLang: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const base = ttsLang.split('-')[0];
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return true; // voices load async — assume yes until known
  return voices.some((v) => v.lang?.toLowerCase().startsWith(base));
}

/** Speaks text in the given language; resolves when finished or cancelled. */
export function speakTranslation(text: string, ttsLang: string, rate = 0.9): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) {
      resolve();
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const base = ttsLang.split('-')[0];
    const match = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith(base));
    if (match) u.voice = match;
    u.lang = match?.lang || ttsLang;
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  });
}

export const cancelSpeech = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
};
