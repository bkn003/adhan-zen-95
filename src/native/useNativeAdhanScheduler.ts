import { Capacitor } from '@capacitor/core';
import { LocalNotifications, Channel, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import type { Prayer } from '@/types/prayer.types';
import { scheduleDndForPrayers, scheduleReliableAlarms, getDndSettings, updateCountdownPrayers } from './dndService';

// Helper: parse "HH:mm" or "hh:mm AM" into a Date on a given day
function parseTimeToDate(time: string, baseDate: Date): Date {
  const date = new Date(baseDate);
  const trimmed = time.trim();
  let hours = 0;
  let minutes = 0;

  if (/am|pm/i.test(trimmed)) {
    // 12-hour format
    const [hm, ap] = trimmed.split(/\s+/);
    const [h, m] = hm.split(':').map(Number);
    hours = h % 12 + (/pm/i.test(ap) ? 12 : 0);
    minutes = m || 0;
  } else {
    // 24-hour format
    const [h, m] = trimmed.split(':').map(Number);
    hours = h || 0;
    minutes = m || 0;
  }

  date.setHours(hours, minutes, 0, 0);
  return date;
}

async function ensureChannel(): Promise<void> {
  // Android: create a channel with custom sound (placed in android/app/src/main/res/raw/adhan.mp3)
  const channel: Channel = {
    id: 'adhan_channel',
    name: 'Adhan',
    description: 'Prayer time Adhan alerts',
    importance: 5,
    visibility: 1,
    sound: 'adhan', // file name without extension, must exist under res/raw
    lights: true,
    vibration: true,
  };
  try {
    await LocalNotifications.createChannel(channel);
  } catch (e) {
    console.warn('LocalNotifications.createChannel failed (non-Android?):', e);
  }
}

async function requestPermission(): Promise<boolean> {
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display === 'granted') return true;
  const res = await LocalNotifications.requestPermissions();
  return res.display === 'granted';
}

function buildNotification(prayer: Prayer, when: Date, idBase: number): LocalNotificationSchema {
  const title = `${prayer.name} Adhan`;
  return {
    id: idBase,
    title,
    body: 'It\'s time for prayer',
    schedule: { at: when, allowWhileIdle: true } as any,
    channelId: 'adhan_channel',
    sound: 'adhan', // Android: plays res/raw/adhan
    smallIcon: 'ic_stat_name',
    actionTypeId: 'OPEN_APP',
    extra: { type: prayer.type },
  } as LocalNotificationSchema;
}

export async function scheduleTodayAdhanNotifications(prayers: Prayer[], baseDate: Date): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const ok = await requestPermission();
  if (!ok) return;
  await ensureChannel();

  const now = new Date();
  const typesToSchedule: Prayer['type'][] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  // Count future prayers for logging
  const futurePrayers = prayers.filter((p) => {
    if (!typesToSchedule.includes(p.type)) return false;
    const when = parseTimeToDate(p.adhan, baseDate);
    return when > now;
  });

  // NOTE: We do NOT use LocalNotifications.schedule() anymore to avoid duplicate notifications.
  // The AlarmManager via scheduleReliableAlarms() is the ONLY source of Adhan notifications.
  // This prevents multiple notification systems from triggering for the same prayer.
  console.log(`📱 Preparing ${futurePrayers.length} prayers for AlarmManager scheduling (LocalNotifications disabled to prevent duplicates)`);

  // Store prayer data for boot receiver to reschedule
  try {
    const prayerData = {
      prayers: prayers.map(p => ({ name: p.name, adhan: p.adhan, iqamah: p.iqamah, type: p.type })),
      date: baseDate.getTime(),
    };
    // Helpful for web debugging
    localStorage.setItem('native_prayer_data', JSON.stringify(prayerData));
    // Persist to Android SharedPreferences via Capacitor Preferences so BootReceiver can read it
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: 'today_prayers', value: JSON.stringify(prayerData) });
    }
  } catch (e) {
    console.warn('Failed to store prayer data for boot recovery:', e);
  }


  // === NEW: Schedule reliable AlarmManager alarms (survive app being killed) ===
  try {
    const alarmCount = await scheduleReliableAlarms(
      prayers.filter(p => typesToSchedule.includes(p.type)).map(p => ({
        name: p.name,
        adhan: p.adhan,
        iqamah: p.iqamah,
        type: p.type
      })),
      baseDate
    );
    console.log(`⏰ Scheduled ${alarmCount} reliable AlarmManager alarms`);
  } catch (e) {
    console.warn('Failed to schedule reliable alarms:', e);
  }

  // === NEW: Schedule DND for Iqamah times ===
  try {
    const dndSettings = await getDndSettings();

    if (dndSettings.enabled) {
      // Filter prayers to only those enabled for DND
      const prayersForDnd = prayers.filter(p =>
        typesToSchedule.includes(p.type) &&
        dndSettings.enabledPrayers.includes(p.type)
      );

      const dndCount = await scheduleDndForPrayers(
        prayersForDnd.map(p => ({
          name: p.name,
          adhan: p.adhan,
          iqamah: p.iqamah,
          type: p.type
        })),
        baseDate,
        dndSettings.beforeMinutes,
        dndSettings.afterMinutes
      );
      console.log(`🔇 Scheduled DND for ${dndCount} prayers (${dndSettings.beforeMinutes}m before, ${dndSettings.afterMinutes}m after Iqamah)`);
    } else {
      console.log('🔇 DND is disabled by user settings');
    }
  } catch (e) {
    console.warn('Failed to schedule DND:', e);
  }

  // === UPDATE: Update the countdown notification service with prayer times ===
  try {
    const countdownPrayers = prayers
      .filter(p => typesToSchedule.includes(p.type))
      .map(p => ({ name: p.name, adhan: p.adhan }));

    await updateCountdownPrayers(countdownPrayers);
    console.log(`🕌 Updated countdown notification with ${countdownPrayers.length} prayers`);
  } catch (e) {
    console.warn('Failed to update countdown prayers:', e);
  }
}

