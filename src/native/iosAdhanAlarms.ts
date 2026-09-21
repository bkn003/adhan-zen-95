/**
 * iPhone adhan + iqamah alarms.
 *
 * Android uses AlarmManager (exact alarms that survive reboot). iOS has no
 * equivalent, so the reliable route is to pre-schedule real local notifications
 * for the coming days: iOS delivers them with sound even when the app is closed
 * and re-arms them itself after a restart, because they live in the system.
 *
 * We re-schedule every time prayer times load, so the queue stays fresh.
 */
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Prayer } from '@/types/prayer.types';
import { loadPrayerNotificationPrefs, isEnabled } from './prayerNotificationPrefs';

/** iOS caps pending notifications at 64, so 7 days × 5 prayers × 2 phases fits. */
const DAYS_AHEAD = 6;
const ID_BASE = 710000;

const PRAYER_TYPES: Prayer['type'][] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

const toDate = (time: string, base: Date): Date | null => {
  const m = (time || '').trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10) % (m[3] ? 12 : 24);
  if (m[3] && /pm/i.test(m[3])) h += 12;
  const d = new Date(base);
  d.setHours(h, parseInt(m[2], 10), 0, 0);
  return d;
};

export const isIos = () => Capacitor.getPlatform() === 'ios';

/** Clears our own pending alarms without touching other notifications. */
async function clearOurs() {
  try {
    const { notifications } = await LocalNotifications.getPending();
    const ids = (notifications ?? [])
      .filter((n) => Number(n.id) >= ID_BASE)
      .map((n) => ({ id: Number(n.id) }));
    if (ids.length) await LocalNotifications.cancel({ notifications: ids });
  } catch (e) {
    console.warn('iOS alarm cleanup failed', e);
  }
}

/**
 * Schedules adhan and jamaat alarms for today and the next few days on iPhone.
 * Returns how many alarms are now armed (0 on other platforms).
 */
export async function scheduleIosAdhanAlarms(prayers: Prayer[]): Promise<number> {
  if (!isIos() || !prayers.length) return 0;

  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== 'granted') {
    const asked = await LocalNotifications.requestPermissions();
    if (asked.display !== 'granted') return 0;
  }

  await clearOurs();

  const prefs = loadPrayerNotificationPrefs();
  const now = new Date();
  const queue: any[] = [];
  let seq = 0;

  for (let day = 0; day <= DAYS_AHEAD; day++) {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day);
    for (const prayer of prayers) {
      if (!PRAYER_TYPES.includes(prayer.type)) continue;
      const phases: Array<{ phase: 'adhan' | 'iqamah'; time?: string }> = [
        { phase: 'adhan', time: prayer.adhan },
        { phase: 'iqamah', time: prayer.iqamah },
      ];
      for (const { phase, time } of phases) {
        if (!isEnabled(prefs, prayer.type, phase)) continue;
        const when = toDate(time || '', base);
        if (!when || when <= now) continue;
        queue.push({
          id: ID_BASE + seq++,
          title: phase === 'adhan' ? `${prayer.name} Adhan` : `${prayer.name} Jamaat`,
          body: phase === 'adhan' ? "It's time for prayer" : 'Jamaat is about to begin',
          schedule: { at: when, allowWhileIdle: true },
          sound: 'adhan.caf',
          extra: { type: prayer.type, phase },
        });
      }
    }
  }

  // Keep well inside the iOS pending limit, nearest alarms first.
  const batch = queue.sort((a, b) => a.schedule.at - b.schedule.at).slice(0, 60);
  if (!batch.length) return 0;

  try {
    await LocalNotifications.schedule({ notifications: batch });
    return batch.length;
  } catch (e) {
    console.warn('iOS alarm scheduling failed', e);
    return 0;
  }
}
