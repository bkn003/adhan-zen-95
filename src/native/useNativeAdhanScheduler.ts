import { Capacitor } from '@capacitor/core';
import { LocalNotifications, Channel, LocalNotificationSchema } from '@capacitor/local-notifications';
import type { Prayer } from '@/types/prayer.types';

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
  // Android: create a channel with custom sound (placed in android/app/src/main/res/raw/azan1.mp3)
  const channel: Channel = {
    id: 'adhan_channel',
    name: 'Adhan',
    description: 'Prayer time Adhan alerts',
    importance: 5,
    visibility: 1,
    sound: 'azan1', // file name without extension, must exist under res/raw
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
    sound: 'azan1', // Android: plays res/raw/azan1
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
  const notifications: LocalNotificationSchema[] = [];
  let id = Math.floor((baseDate.getTime() / 1000) % 1000000) * 10; // deterministic-ish daily id base

  const typesToSchedule: Prayer['type'][] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  prayers.forEach((p) => {
    if (!typesToSchedule.includes(p.type)) return;
    const when = parseTimeToDate(p.adhan, baseDate);
    if (when > now) {
      notifications.push(buildNotification(p, when, ++id));
    }
  });

  // Optional: schedule Jummah if Friday
  const isFriday = baseDate.getDay() === 5;
  if (isFriday) {
    const jummah = prayers.find((p) => p.type === 'jummah');
    if (jummah) {
      const when = parseTimeToDate(jummah.adhan, baseDate);
      if (when > now) notifications.push(buildNotification(jummah, when, ++id));
    }
  }

  if (notifications.length) {
    await LocalNotifications.schedule({ notifications });
  }
}
