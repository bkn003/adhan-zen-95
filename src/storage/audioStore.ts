import { get, set } from 'idb-keyval';

const AUDIO_KEY = 'adhan_audio_blob_v2';

/**
 * Store Adhan audio blob directly to IndexedDB
 */
export async function storeAdhanAudio(audioBlob: Blob): Promise<void> {
  try {
    await set(AUDIO_KEY, audioBlob);
    console.log('💾 Adhan audio stored to IndexedDB:', audioBlob.size, 'bytes');
  } catch (e) {
    console.error('❌ Failed to store adhan audio:', e);
    throw e;
  }
}

/**
 * Get cached audio blob
 */
export async function getAdhanAudio(): Promise<Blob | undefined> {
  try {
    const blob = (await get(AUDIO_KEY)) as Blob | undefined;
    return blob;
  } catch (e) {
    console.error('❌ Failed to get adhan audio:', e);
    return undefined;
  }
}

// Cache the Adhan audio for offline foreground playback
export async function ensureAdhanAudioCached(sourceUrl: string): Promise<void> {
  try {
    const cached = await get(AUDIO_KEY);
    if (cached) {
      console.log('✅ Adhan audio already cached in IndexedDB');
      return;
    }

    console.log('⬇️ Downloading Adhan audio for offline use...');
    const res = await fetch(sourceUrl, { cache: 'force-cache' }); // expects /adhan-native.mp3
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const blob = await res.blob();
    await set(AUDIO_KEY, blob);
    console.log('💾 Adhan audio cached to IndexedDB:', blob.size, 'bytes');
    
    // Warm a blob URL to verify it works
    const testUrl = URL.createObjectURL(blob);
    URL.revokeObjectURL(testUrl);
  } catch (e) {
    console.error('❌ Failed to cache adhan audio:', e);
  }
}

// Retrieve cached audio as a blob URL for playback
export async function getAdhanAudioUrl(): Promise<string | undefined> {
  try {
    const blob = (await get(AUDIO_KEY)) as Blob | undefined;
    if (!blob) {
      console.warn('⚠️ No cached adhan audio found in IndexedDB');
      return undefined;
    }
    const url = URL.createObjectURL(blob);
    console.log('🔊 Retrieved adhan audio URL from IndexedDB cache');
    return url;
  } catch (e) {
    console.error('❌ Failed to read adhan audio from cache:', e);
    return undefined;
  }
}

// Force re-download of audio (useful for updates)
export async function refreshAdhanAudio(sourceUrl: string): Promise<void> {
  try {
    console.log('🔄 Refreshing Adhan audio...');
    const res = await fetch(sourceUrl, { cache: 'reload' });
    const blob = await res.blob();
    await set(AUDIO_KEY, blob);
    console.log('✅ Adhan audio refreshed');
  } catch (e) {
    console.error('❌ Failed to refresh adhan audio:', e);
  }
}
