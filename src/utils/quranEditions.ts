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

/** Voices that sound natural rather than the old robotic default engines. */
const RICH_HINTS = /(enhanced|premium|neural|natural|network|wavenet|studio|journey|google|siri|eloquence|multilingual)/i;
const POOR_HINTS = /(compact|espeak|pico|robot|legacy)/i;

/**
 * Male / female hints. Android's Google voices are named "xx-IN-language#male_1-local"
 * etc., iOS uses given names, so both patterns are covered.
 */
const MALE_HINTS = /(#male|_male|\bmale\b|man\b|hombre|masculin|aaron|alex|arthur|daniel|david|diego|fred|gordon|hemant|jorge|juan|liam|male[-_ ]?[0-9]|oliver|rishi|thomas|tom\b|xander|yannick)/i;
const FEMALE_HINTS = /(#female|_female|\bfemale\b|woman|mujer|f[eé]minin|alice|amelie|anna|carmit|catherine|fiona|joana|karen|kate|lekha|luciana|martha|moira|monica|nicky|nora|paulina|rishi_female|samantha|sara|serena|susan|tessa|veena|victoria|zosia|zuzana)/i;

export type VoiceGender = 'male' | 'female' | 'any';

/** Best guess at a voice's gender from its name — undefined when unknown. */
export function voiceGenderOf(v: SpeechSynthesisVoice): VoiceGender | undefined {
  const label = `${v.name} ${v.voiceURI}`;
  if (MALE_HINTS.test(label)) return 'male';
  if (FEMALE_HINTS.test(label)) return 'female';
  return undefined;
}

/** Does the device have a voice that can read this language aloud? */
export function hasVoiceFor(ttsLang: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const base = ttsLang.split('-')[0];
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return true; // voices load async — assume yes until known
  return voices.some((v) => v.lang?.toLowerCase().startsWith(base));
}

/**
 * Pick the highest-quality voice available for a language, preferring the
 * requested gender (male by default, to match a reciter's voice).
 * Deterministic: voices are scored, then ties break on name so the same device
 * always recites with the same voice.
 */
export function pickBestVoice(ttsLang: string, prefer: VoiceGender = 'male'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const base = ttsLang.split('-')[0].toLowerCase();
  const candidates = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang?.toLowerCase().startsWith(base));
  if (!candidates.length) return null;

  const score = (v: SpeechSynthesisVoice) => {
    const label = `${v.name} ${v.voiceURI}`;
    let s = 0;
    const gender = voiceGenderOf(v);
    if (prefer !== 'any') {
      // Gender outweighs fidelity: a male voice is the point of the setting.
      if (gender === prefer) s += 140;
      else if (gender && gender !== prefer) s -= 90;
    }
    if (RICH_HINTS.test(label)) s += 60;
    if (POOR_HINTS.test(label)) s -= 50;
    if (!v.localService) s += 20; // server voices are usually higher fidelity
    if (v.lang?.toLowerCase() === ttsLang.toLowerCase()) s += 8;
    if (v.default) s += 2;
    return s;
  };

  return [...candidates].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0];
}

/** True when the chosen voice is one of the device's natural/enhanced voices. */
export const hasNaturalVoiceFor = (ttsLang: string, prefer: VoiceGender = 'male') => {
  const v = pickBestVoice(ttsLang, prefer);
  return !!v && RICH_HINTS.test(`${v.name} ${v.voiceURI}`);
};

/** True when a voice of the requested gender actually exists for this language. */
export function hasGenderedVoiceFor(ttsLang: string, prefer: VoiceGender): boolean {
  if (prefer === 'any') return hasVoiceFor(ttsLang);
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const base = ttsLang.split('-')[0].toLowerCase();
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang?.toLowerCase().startsWith(base))
    .some((v) => voiceGenderOf(v) === prefer);
}

/**
 * Strips everything a speech engine would read out as noise:
 * verse numbers, footnote markers, bracketed glosses, asterisks, quotes,
 * dashes, ellipses and repeated punctuation. Sentence-ending punctuation is
 * kept so the engine still pauses naturally.
 */
export function sanitizeForSpeech(raw: string): string {
  let t = String(raw ?? '');
  t = t.replace(/<[^>]+>/g, ' ');                     // any leftover markup
  t = t.replace(/\[[^\]]*\]/g, ' ');                  // [1], [see note]
  t = t.replace(/\{[^}]*\}/g, ' ');                   // {…}
  t = t.replace(/\([^)]{0,60}\)/g, ' ');              // short parenthetical glosses
  t = t.replace(/[*_#~^`|/\\<>=+°•·¶§©™]/g, ' ');     // symbol characters
  t = t.replace(/["“”‘’«»]/g, ' ');                   // quote marks
  t = t.replace(/[–—-]{1,}/g, ' ');                   // dashes
  t = t.replace(/\.{2,}/g, '.');                      // ellipses -> single stop
  t = t.replace(/\s*:\s*/g, ', ');                    // colons read badly
  t = t.replace(/\s*;\s*/g, ', ');
  t = t.replace(/^\s*\d+\s*[.)]?\s*/g, '');           // leading verse number
  t = t.replace(/\s+\d{1,4}\s*$/g, '');               // trailing verse number
  t = t.replace(/([.,!?])\1+/g, '$1');                // duplicated punctuation
  t = t.replace(/\s+([.,!?])/g, '$1');
  t = t.replace(/\s{2,}/g, ' ').trim();
  return t;
}

/**
 * Speaks text with an unhurried recitation cadence, using the device's best
 * voice for the language. Long verses are split into clauses and queued so the
 * engine breathes between them instead of racing through one block.
 */
export function speakTranslation(text: string, ttsLang: string, rate = 0.85): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }
    const clean = sanitizeForSpeech(text);
    if (!clean) {
      resolve();
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();

    const voice = pickBestVoice(ttsLang);
    // Split on sentence ends / commas, keeping chunks speakable in one breath.
    const chunks = clean
      .split(/(?<=[.!?])\s+|,\s+/)
      .map((c) => c.trim())
      .filter(Boolean)
      .reduce<string[]>((acc, part) => {
        const last = acc[acc.length - 1];
        if (last && (last + ' ' + part).length < 140) acc[acc.length - 1] = `${last} ${part}`;
        else acc.push(part);
        return acc;
      }, []);

    let i = 0;
    const speakNext = () => {
      if (i >= chunks.length) {
        resolve();
        return;
      }
      const u = new SpeechSynthesisUtterance(chunks[i++]);
      if (voice) u.voice = voice;
      u.lang = voice?.lang || ttsLang;
      u.rate = rate;
      u.pitch = 1;
      u.volume = 1;
      u.onend = () => setTimeout(speakNext, 180); // natural pause between clauses
      u.onerror = () => resolve();
      synth.speak(u);
    };
    speakNext();
  });
}

export const cancelSpeech = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
};
