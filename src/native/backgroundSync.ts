import { Capacitor, registerPlugin } from '@capacitor/core';
import { createLocationSlug } from '@/utils/staticPrayerTimes';

interface AdhanNativeBackground {
  configureBackgroundSync(opts: { baseUrl: string; locationSlug: string; mosqueName?: string }): Promise<{ success: boolean }>;
  refreshPrayerTimes(): Promise<{ success: boolean }>;
}

const AdhanNative = registerPlugin<AdhanNativeBackground>('AdhanNative');

/**
 * Tell the native Android WorkManager where to fetch prayer JSON from.
 * Safe to call on web (no-op).
 */
export async function configureAndroidBackgroundSync(mosqueName: string) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const slug = createLocationSlug(mosqueName);
    // Use current origin — same server that serves /prayer_times/<slug>/<yyyy-mm>.json
    const baseUrl = window.location.origin;
    await AdhanNative.configureBackgroundSync({ baseUrl, locationSlug: slug, mosqueName });
    console.log('📡 Android background sync configured for', slug, '@', baseUrl);
  } catch (e) {
    console.warn('configureAndroidBackgroundSync failed', e);
  }
}

export async function triggerAndroidBackgroundSync() {
  if (!Capacitor.isNativePlatform()) return;
  try { await AdhanNative.refreshPrayerTimes(); } catch {}
}
