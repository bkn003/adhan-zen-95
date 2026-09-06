import { useState, useEffect, useRef } from 'react';
import type { Prayer } from '@/types/prayer.types';
import { formatTo12Hour } from '@/utils/timeFormat';
import { loadPrayerNotificationPrefs, isEnabled } from '@/native/prayerNotificationPrefs';

interface AlarmState {
  active: boolean;
  prayerName: string;
  prayerTime: string;
}

/** Minutes since midnight for "HH:mm" or "hh:mm AM/PM". */
const toMinutes = (raw?: string): number | null => {
  if (!raw) return null;
  const t = raw.trim();
  const m = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10) % (m[3] ? 12 : 24);
  if (m[3] && /pm/i.test(m[3])) h += 12;
  return h * 60 + parseInt(m[2], 10);
};

export const usePrayerAlarm = (prayers: Prayer[]) => {
  const [alarm, setAlarm] = useState<AlarmState>({ active: false, prayerName: '', prayerTime: '' });
  const firedRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Reset fired alarms at midnight
    const now = new Date();
    const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const midnightTimer = setTimeout(() => {
      firedRef.current.clear();
    }, msToMidnight);

    return () => clearTimeout(midnightTimer);
  }, []);

  useEffect(() => {
    if (!prayers.length) return;

    const alarmEnabled = localStorage.getItem('adhanNotifications') === 'true' ||
                         localStorage.getItem('prayerAlarmEnabled') === 'true';
    if (!alarmEnabled) return;

    // Check every 10 seconds
    intervalRef.current = setInterval(() => {
      const prefs = loadPrayerNotificationPrefs();
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      for (const prayer of prayers) {
        if (prayer.type === 'tarawih') continue;

        const phases: Array<{ phase: 'adhan' | 'iqamah'; time?: string }> = [
          { phase: 'adhan', time: prayer.adhan },
          { phase: 'iqamah', time: prayer.iqamah },
        ];

        for (const { phase, time } of phases) {
          if (!isEnabled(prefs, prayer.type, phase)) continue;
          const target = toMinutes(time);
          if (target === null) continue;

          const key = `${prayer.name}-${phase}-${time}`;
          if (firedRef.current.has(key)) continue;
          if (currentMinutes !== target) continue;

          firedRef.current.add(key);

          const title = phase === 'adhan' ? `${prayer.name} Prayer Time` : `${prayer.name} Jamaat Time`;

          // Show notification
          if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(reg => {
              reg.showNotification(title, {
                body: `Adhan: ${formatTo12Hour(prayer.adhan)} | Iqamah: ${formatTo12Hour(prayer.iqamah)}`,
                icon: '/app-icon-192.png',
                badge: '/app-icon-192.png',
                tag: `${phase}-${prayer.name}`,
                requireInteraction: true,
                ...(('vibrate' in Notification.prototype) ? { vibrate: [200, 100, 200, 100, 200] } : {}),
              });
            }).catch(console.error);
          }

          // Trigger full-screen alarm overlay
          setAlarm({
            active: true,
            prayerName: phase === 'adhan' ? prayer.name : `${prayer.name} — Jamaat`,
            prayerTime: formatTo12Hour(time!),
          });
          return;
        }
      }
    }, 10000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [prayers]);

  const dismissAlarm = () => {
    setAlarm({ active: false, prayerName: '', prayerTime: '' });
  };

  return { alarm, dismissAlarm };
};
