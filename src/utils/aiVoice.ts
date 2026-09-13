import { get, set } from 'idb-keyval';

/**
 * Natural (studio-quality) recitation voice for languages where the phone's own
 * voice sounds robotic — Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali,
 * Gujarati, Marathi — and for the Arabic text of hadith.
 *
 * Audio is generated once, then cached on the device so replays and offline
 * reading work without generating it again.
 */

const SUPABASE_URL = 'https://lhufqnokmdqkvzcxqwkl.supabase.co';
const FN_URL = `${SUPABASE_URL}/functions/v1/ai-voice`;
const PREF_KEY = 'ai_natural_voice_v1';

export const isAiVoiceEnabled = () => localStorage.getItem(PREF_KEY) !== 'false';
export const setAiVoiceEnabled = (on: boolean) => localStorage.setItem(PREF_KEY, String(on));

/** Languages that only have robotic device voices — AI voice helps most here. */
const AI_VOICE_LANGS = new Set(['ta', 'hi', 'te', 'kn', 'ml', 'bn', 'gu', 'mr', 'ar', 'ur']);
export const aiVoiceHelpsFor = (langCode: string) => AI_VOICE_LANGS.has(langCode);

const hash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
};

/** Strips verse numbers, footnote markers and stray symbols so nothing is read aloud as a symbol. */
export const sanitizeForSpeech = (raw: string) =>
  raw
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\d[^)]*\)/g, ' ')
    .replace(/[*_#`~^<>|=+{}]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

let current: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

export const cancelAiVoice = () => {
  try {
    current?.pause();
  } catch {}
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  current = null;
  currentUrl = null;
};

async function fetchAudio(text: string, language: string, voice: string): Promise<Blob> {
  const key = `aiv_${hash(`${language}|${voice}|${text}`)}`;
  const cached = (await get(key).catch(() => undefined)) as Blob | undefined;
  if (cached) return cached;

  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language, voice }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any)?.error || 'Natural voice is unavailable right now.');
  }
  const blob = await res.blob();
  await set(key, blob).catch(() => {});
  return blob;
}

export interface AiSpeakOptions {
  /** Display name of the language, e.g. "Tamil". */
  language: string;
  /** Playback speed (0.7 slow … 1 normal). */
  rate?: number;
  /** TTS voice; deep male reciter by default. */
  voice?: string;
}

/** Plays one passage with the natural voice. Resolves when playback ends. */
export async function speakWithAiVoice(rawText: string, opts: AiSpeakOptions): Promise<void> {
  const text = sanitizeForSpeech(rawText);
  if (!text) return;

  const blob = await fetchAudio(text, opts.language, opts.voice || 'onyx');
  cancelAiVoice();

  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.playbackRate = Math.min(1.5, Math.max(0.6, opts.rate ?? 0.9));
  current = audio;
  currentUrl = url;

  await new Promise<void>((resolve, reject) => {
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error('Recitation could not be played.'));
    audio.play().catch(reject);
  });

  if (current === audio) cancelAiVoice();
}
