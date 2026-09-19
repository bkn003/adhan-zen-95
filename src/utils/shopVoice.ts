/**
 * Spoken shop listings — the same two-step voice chain the Quran/Hadith readers use.
 *
 * 1. If the shop uploaded a real human voice clip for the reader's language
 *    (`<shopId>/voice-<lang>.m4a|mp3|wav` in the private `shop-media` bucket),
 *    that recording plays.
 * 2. Otherwise the listing is spoken with the natural (AI) voice for Hindi, Tamil
 *    and the other languages whose device voices sound robotic, falling back to
 *    the phone's own voice, and finally to a clear "no voice available" error.
 */
import { speakWithAiVoice, cancelAiVoice, aiVoiceHelpsFor, isAiVoiceEnabled } from './aiVoice';
import { getShopMediaUrls, formatMoney, type Shop, type ShopProduct } from './shopApi';

const VOICE_EXTS = ['m4a', 'mp3', 'wav', 'ogg'];

export const shopVoicePaths = (shopId: string, lang: string) =>
  VOICE_EXTS.map((ext) => `${shopId}/voice-${lang}.${ext}`);

export const shopVoiceUploadPath = (shopId: string, lang: string, fileName: string) =>
  `${shopId}/voice-${lang}.${(fileName.split('.').pop() || 'mp3').toLowerCase()}`;

/** Signed URL of an uploaded clip for this shop + language, if one exists. */
export async function findShopVoiceClip(shopId: string, lang: string): Promise<string | null> {
  const urls = await getShopMediaUrls(shopVoicePaths(shopId, lang)).catch(() => ({}));
  for (const p of shopVoicePaths(shopId, lang)) {
    if (urls[p]) {
      // A signed URL is issued even for a missing object, so confirm it resolves.
      const ok = await fetch(urls[p], { method: 'GET', headers: { Range: 'bytes=0-1' } })
        .then((r) => r.ok)
        .catch(() => false);
      if (ok) return urls[p];
    }
  }
  return null;
}

const SCRIPTS: Record<string, (s: Shop, items: string) => string> = {
  hi: (s, items) =>
    `${s.name}. ${s.category}. ${s.address ?? ''}. ${
      s.delivery_available ? 'डिलीवरी उपलब्ध है।' : 'केवल पिकअप।'
    } आज उपलब्ध सामान: ${items}`,
  ta: (s, items) =>
    `${s.name}. ${s.category}. ${s.address ?? ''}. ${
      s.delivery_available ? 'டெலிவரி உண்டு.' : 'பிக்அப் மட்டும்.'
    } இன்று கிடைக்கும் பொருட்கள்: ${items}`,
  en: (s, items) =>
    `${s.name}. ${s.category}. ${s.address ?? ''}. ${
      s.delivery_available ? 'Delivery available.' : 'Pickup only.'
    } Available today: ${items}`,
};

/** The text that gets read aloud for a shop page. */
export function buildShopScript(shop: Shop, products: ShopProduct[], lang: string): string {
  const items =
    products
      .filter((p) => p.is_available)
      .slice(0, 12)
      .map((p) => `${p.name}, ${formatMoney(Number(p.price))}${p.unit ? ` per ${p.unit}` : ''}`)
      .join('. ') || '—';
  return (SCRIPTS[lang] ?? SCRIPTS.en)(shop, items);
}

const LANG_TAGS: Record<string, string> = {
  hi: 'hi-IN',
  ta: 'ta-IN',
  ur: 'ur-PK',
  bn: 'bn-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  gu: 'gu-IN',
  mr: 'mr-IN',
  ar: 'ar-SA',
  en: 'en-IN',
};

const LANG_NAMES: Record<string, string> = {
  hi: 'Hindi',
  ta: 'Tamil',
  ur: 'Urdu',
  bn: 'Bengali',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  gu: 'Gujarati',
  mr: 'Marathi',
  ar: 'Arabic',
  en: 'English',
};

let clip: HTMLAudioElement | null = null;

export function stopShopVoice() {
  try {
    clip?.pause();
  } catch {}
  clip = null;
  cancelAiVoice();
  try {
    window.speechSynthesis?.cancel();
  } catch {}
}

function speakWithDevice(text: string, lang: string, rate: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const synth = window.speechSynthesis;
    if (!synth) return reject(new Error('This phone has no voice for shop listings yet.'));
    const tag = LANG_TAGS[lang] ?? 'en-IN';
    const voice = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith(tag.slice(0, 2)));
    if (!voice) return reject(new Error(`No ${LANG_NAMES[lang] ?? lang} voice is installed on this phone.`));
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = tag;
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = () => reject(new Error('The voice stopped unexpectedly.'));
    synth.speak(u);
  });
}

/** Plays the shop listing: uploaded clip first, then natural voice, then device voice. */
export async function playShopVoice(opts: {
  shop: Shop;
  products: ShopProduct[];
  lang: string;
  rate?: number;
}): Promise<'clip' | 'ai' | 'device'> {
  const { shop, products, lang } = opts;
  const rate = opts.rate ?? 1;
  stopShopVoice();

  const uploaded = await findShopVoiceClip(shop.id, lang);
  if (uploaded) {
    const audio = new Audio(uploaded);
    audio.playbackRate = Math.min(1.5, Math.max(0.6, rate));
    clip = audio;
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('That recording could not be played.'));
      audio.play().catch(reject);
    });
    return 'clip';
  }

  const text = buildShopScript(shop, products, lang);

  if (aiVoiceHelpsFor(lang) && isAiVoiceEnabled()) {
    try {
      await speakWithAiVoice(text, { language: LANG_NAMES[lang] ?? 'English', rate, voice: 'onyx' });
      return 'ai';
    } catch {
      // fall through to the phone's own voice
    }
  }

  await speakWithDevice(text, lang, rate);
  return 'device';
}
