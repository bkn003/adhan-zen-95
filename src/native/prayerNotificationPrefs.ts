import { Capacitor, registerPlugin } from '@capacitor/core';

export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerNotificationPrefs {
  adhan: Record<PrayerKey, boolean>;
  iqamah: Record<PrayerKey, boolean>;
  ramadan: boolean; // Sahar / Iftar / Tharaweeh alerts
}

const KEY = 'prayerNotificationPrefs';

export const PRAYER_KEYS: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const defaultPrefs = (): PrayerNotificationPrefs => ({
  adhan: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
  iqamah: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
  ramadan: true,
});

export function loadPrayerNotificationPrefs(): PrayerNotificationPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw);
    const d = defaultPrefs();
    return {
      adhan: { ...d.adhan, ...(parsed.adhan || {}) },
      iqamah: { ...d.iqamah, ...(parsed.iqamah || {}) },
      ramadan: parsed.ramadan ?? d.ramadan,
    };
  } catch {
    return defaultPrefs();
  }
}

interface TogglePlugin {
  setNotificationToggles(opts: { toggles: string }): Promise<{ success: boolean }>;
}
const AdhanNative = registerPlugin<TogglePlugin>('AdhanNative');

/** Persist locally and push down to the native alarm scheduler. */
export async function savePrayerNotificationPrefs(prefs: PrayerNotificationPrefs) {
  localStorage.setItem(KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent('prayer-notification-prefs-changed'));
  if (Capacitor.isNativePlatform()) {
    try {
      await AdhanNative.setNotificationToggles({ toggles: JSON.stringify(prefs) });
    } catch {
      /* plugin method may not exist on older builds */
    }
  }
}

/** True if a given prayer/phase should notify. */
export function isEnabled(prefs: PrayerNotificationPrefs, prayer: string, phase: 'adhan' | 'iqamah') {
  const key = prayer.toLowerCase() as PrayerKey;
  if (!PRAYER_KEYS.includes(key)) return true;
  return prefs[phase][key];
}
