import { getAdhanAudioUrl } from '@/storage/audioStore';

/**
 * Foreground Adhan audio player
 * Plays Adhan sound when app is open using cached audio from IndexedDB
 */

let currentAudio: HTMLAudioElement | null = null;

// Play Adhan sound in foreground
export async function playAdhanInForeground(): Promise<void> {
  try {
    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    // Get cached audio URL from IndexedDB
    const audioUrl = await getAdhanAudioUrl();
    
    if (!audioUrl) {
      console.warn('⚠️ No cached Adhan audio available, falling back to network');
      // Fallback to network if cache not available
      playFromUrl('/adhan-native.mp3');
      return;
    }

    console.log('🔊 Playing Adhan from cached audio');
    currentAudio = new Audio(audioUrl);
    
    // Get volume from settings (default 0.8)
    const volume = parseFloat(localStorage.getItem('adhanVolume') || '0.8');
    currentAudio.volume = Math.max(0, Math.min(1, volume));
    
    currentAudio.addEventListener('ended', () => {
      if (currentAudio && audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      currentAudio = null;
    });

    currentAudio.addEventListener('error', (e) => {
      console.error('❌ Error playing Adhan audio:', e);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      currentAudio = null;
    });

    await currentAudio.play();
  } catch (error) {
    console.error('❌ Failed to play Adhan in foreground:', error);
  }
}

// Play from URL (fallback)
function playFromUrl(url: string): void {
  try {
    currentAudio = new Audio(url);
    const volume = parseFloat(localStorage.getItem('adhanVolume') || '0.8');
    currentAudio.volume = Math.max(0, Math.min(1, volume));
    
    currentAudio.addEventListener('ended', () => {
      currentAudio = null;
    });

    currentAudio.play().catch(console.error);
  } catch (error) {
    console.error('❌ Error playing from URL:', error);
  }
}

// Stop currently playing Adhan
export function stopAdhan(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

// Set volume for Adhan playback
export function setAdhanVolume(volume: number): void {
  const clampedVolume = Math.max(0, Math.min(1, volume));
  localStorage.setItem('adhanVolume', clampedVolume.toString());
  
  if (currentAudio) {
    currentAudio.volume = clampedVolume;
  }
}
