import { useEffect, useRef } from 'react';
import type { Prayer } from '@/types/prayer.types';
import { formatTo12Hour } from '@/utils/timeFormat';

const STORED_KEY = 'myMohalla_lastPrayerTimes';

export const usePrayerChangeNotifier = (prayers: Prayer[], mohallaId: string | null) => {
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!mohallaId || !prayers.length || notifiedRef.current) return;

    const currentLocationId = localStorage.getItem('selectedLocationId');
    // Only notify for the user's mohalla mosque
    if (currentLocationId !== mohallaId) return;

    const stored = localStorage.getItem(STORED_KEY);
    if (!stored) {
      // First time - just save
      localStorage.setItem(STORED_KEY, JSON.stringify(prayers.map(p => ({ name: p.name, adhan: p.adhan, iqamah: p.iqamah }))));
      return;
    }

    try {
      const oldPrayers = JSON.parse(stored) as { name: string; adhan: string; iqamah: string }[];
      const changes: string[] = [];

      for (const prayer of prayers) {
        const old = oldPrayers.find(p => p.name === prayer.name);
        if (old) {
          if (old.adhan !== prayer.adhan || old.iqamah !== prayer.iqamah) {
            changes.push(
              `${prayer.name}: Adhan ${formatTo12Hour(old.adhan)} → ${formatTo12Hour(prayer.adhan)}, Iqamah ${formatTo12Hour(old.iqamah)} → ${formatTo12Hour(prayer.iqamah)}`
            );
          }
        }
      }

      if (changes.length > 0) {
        notifiedRef.current = true;

        // Send notification
        if ('Notification' in window && Notification.permission === 'granted') {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(reg => {
              reg.showNotification('🕌 Prayer Times Changed!', {
                body: changes.join('\n'),
                icon: '/app-icon-192.png',
                badge: '/app-icon-192.png',
                tag: 'prayer-time-change',
                requireInteraction: true,
                ...(('vibrate' in Notification.prototype) ? { vibrate: [300, 100, 300] } : {}),
              });
            }).catch(console.error);
          } else {
            new Notification('🕌 Prayer Times Changed!', {
              body: changes.join('\n'),
              icon: '/app-icon-192.png',
            });
          }
        }

        // Save updated times
        localStorage.setItem(STORED_KEY, JSON.stringify(prayers.map(p => ({ name: p.name, adhan: p.adhan, iqamah: p.iqamah }))));
      }
    } catch {}
  }, [prayers, mohallaId]);
};
