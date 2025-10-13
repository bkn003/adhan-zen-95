import { get, set } from 'idb-keyval';

const AUDIO_KEY = 'adhan_audio_blob_v1';

export async function ensureAdhanAudioCached(sourceUrl: string): Promise<void> {
  try {
    const exists = await get(AUDIO_KEY);
    if (exists) return;

    const res = await fetch(sourceUrl, { cache: 'force-cache' });
    const blob = await res.blob();
    await set(AUDIO_KEY, blob);
    // Warm a blob URL once so it's ready for quick playback when app is open
    URL.revokeObjectURL(URL.createObjectURL(blob));
  } catch (e) {
    console.warn('Failed to cache adhan audio:', e);
  }
}

export async function getAdhanAudioUrl(): Promise<string | undefined> {
  try {
    const blob = (await get(AUDIO_KEY)) as Blob | undefined;
    if (!blob) return undefined;
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn('Failed to read adhan audio from cache:', e);
    return undefined;
  }
}
