import { Capacitor, registerPlugin } from '@capacitor/core';

export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

/** Notification "periods" — the moments in a day we can alert about. */
export interface PeriodPrefs {
  /** Heads-up reminder N minutes before adhan. */
  preReminder: boolean;
  /** Alert at the adhan time itself. */
  adhan: boolean;
  /** Alert at the jamaat (iqamah) time. */
  iqamah: boolean;
  /** Weekly schedule-change alerts (1-5, 6-11, 12-17, 18-23, 24-month end). */
  weeklyChange: boolean;
  /** Mosque announcements / events. */
  announcements: boolean;
}

export interface PrayerNotificationPrefs {
  adhan: Record<PrayerKey, boolean>;
  iqamah: Record<PrayerKey, boolean>;
  ramadan: boolean; // Sahar / Iftar / Tharaweeh alerts
  periods: PeriodPrefs;
  /** Minutes before adhan for the heads-up reminder. */
  preMinutes: number;
}

const KEY = 'prayerNotificationPrefs';

export const PRAYER_KEYS: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const PERIOD_KEYS: (keyof PeriodPrefs)[] = [
  'preReminder',
  'adhan',
  'iqamah',
  'weeklyChange',
  'announcements',
];

export const defaultPrefs = (): PrayerNotificationPrefs => ({
  adhan: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
  iqamah: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
  ramadan: true,
  periods: {
    preReminder: true,
    adhan: true,
    iqamah: true,
    weeklyChange: true,
    announcements: true,
  },
  preMinutes: 15,
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
      periods: { ...d.periods, ...(parsed.periods || {}) },
      preMinutes: Number.isFinite(parsed.preMinutes) ? parsed.preMinutes : d.preMinutes,
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
  if (!prefs.periods[phase]) return false;
  const key = prayer.toLowerCase() as PrayerKey;
  if (!PRAYER_KEYS.includes(key)) return true;
  return prefs[phase][key];
}

/** True if a whole notification period is switched on. */
export function isPeriodEnabled(prefs: PrayerNotificationPrefs, period: keyof PeriodPrefs) {
  return !!prefs.periods[period];
}
