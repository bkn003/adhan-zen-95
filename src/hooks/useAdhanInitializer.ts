import { useEffect, useState } from 'react';
import { storeAdhanAudio, getAdhanAudio } from '@/storage/audioStore';
import { isMedianApp, rescheduleAfterBoot } from '@/native/medianBridge';

const ADHAN_AUDIO_URL = 'https://86147f9e-50fb-489a-a685-0e1bedcaa3b4.supabase.co/functions/v1/adhan-audio';
const FALLBACK_URL = 'https://www.islamcan.com/audio/adhan/azan1.mp3';

/**
 * Initializes the Adhan system on app startup
 * - Downloads and caches Adhan audio
 * - Reschedules prayers after device boot
 * - Prepares offline functionality
 */
export function useAdhanInitializer() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeAdhanSystem();
  }, []);

  async function initializeAdhanSystem() {
    try {
      console.log('🚀 Initializing Adhan system...');

      // Check if audio is already cached
      const cachedAudio = await getAdhanAudio();
      
      if (cachedAudio) {
        console.log('✅ Adhan audio already cached');
        setAudioReady(true);
      } else {
        console.log('📥 Downloading Adhan audio...');
        await downloadAndCacheAudio();
      }

      // If running in Median app, check for boot recovery
      if (isMedianApp()) {
        console.log('📱 Median app detected, checking boot recovery...');
        rescheduleAfterBoot();
      }

      setIsInitialized(true);
      console.log('✅ Adhan system initialized successfully');
    } catch (err) {
      console.error('❌ Failed to initialize Adhan system:', err);
      setError(err instanceof Error ? err.message : 'Initialization failed');
      setIsInitialized(true); // Still mark as initialized to not block the app
    }
  }

  async function downloadAndCacheAudio() {
    try {
      // Try primary URL (Supabase edge function)
      let audioBlob = await fetchAudio(ADHAN_AUDIO_URL);
      
      if (!audioBlob) {
        console.log('⚠️ Primary URL failed, trying fallback...');
        audioBlob = await fetchAudio(FALLBACK_URL);
      }

      if (audioBlob) {
        await storeAdhanAudio(audioBlob);
        setAudioReady(true);
        console.log('✅ Adhan audio downloaded and cached');
      } else {
        throw new Error('Failed to download Adhan audio from all sources');
      }
    } catch (err) {
      console.error('❌ Audio download failed:', err);
      throw err;
    }
  }

  async function fetchAudio(url: string): Promise<Blob | null> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`Failed to fetch from ${url}: ${response.status}`);
        return null;
      }

      const blob = await response.blob();
      console.log(`✅ Fetched audio: ${blob.size} bytes`);
      return blob;
    } catch (err) {
      console.error(`Error fetching from ${url}:`, err);
      return null;
    }
  }

  return {
    isInitialized,
    audioReady,
    error,
    reinitialize: initializeAdhanSystem,
  };
}
