import { useEffect } from 'react';
import { useNotifications } from './useNotifications';
import type { Prayer } from '@/types/prayer.types';

export const usePrayerNotifications = (prayers: Prayer[]) => {
  const { enabled, scheduleAdhanNotification } = useNotifications();

  useEffect(() => {
    if (!enabled || !prayers.length) return;

    // Schedule notifications for all prayers
    prayers.forEach(prayer => {
      if (prayer.type !== 'tarawih') { // Don't schedule for tarawih
        scheduleAdhanNotification(prayer.name, prayer.adhan, prayer.iqamah);
      }
    });
  }, [enabled, prayers, scheduleAdhanNotification]);

  return { enabled };
};