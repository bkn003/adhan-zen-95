import { useState, useEffect, useRef } from 'react';
import type { Prayer } from '@/types/prayer.types';
import { formatTo12Hour } from '@/utils/timeFormat';

interface AlarmState {
  active: boolean;
  prayerName: string;
  prayerTime: string;
}

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
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      for (const prayer of prayers) {
        if (prayer.type === 'tarawih') continue;
        const key = `${prayer.name}-${prayer.adhan}`;
        if (firedRef.current.has(key)) continue;

        const parts = prayer.adhan.split(':');
        const prayerMinutes = parseInt(parts[0]) * 60 + parseInt(parts[1]);

        // Trigger within 1 minute window
        if (Math.abs(currentMinutes - prayerMinutes) <= 0) {
          firedRef.current.add(key);
          
          // Show notification
          if ('Notification' in window && Notification.permission === 'granted') {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then(reg => {
                reg.showNotification(`${prayer.name} Prayer Time`, {
                  body: `Adhan: ${formatTo12Hour(prayer.adhan)} | Iqamah: ${formatTo12Hour(prayer.iqamah)}`,
                  icon: '/app-icon-192.png',
                  badge: '/app-icon-192.png',
                  tag: `adhan-${prayer.name}`,
                  requireInteraction: true,
                  ...(('vibrate' in Notification.prototype) ? { vibrate: [200, 100, 200, 100, 200] } : {}),
                });
              }).catch(console.error);
            }
          }

          // Trigger full-screen alarm overlay
          setAlarm({
            active: true,
            prayerName: prayer.name,
            prayerTime: formatTo12Hour(prayer.adhan),
          });
          break;
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
