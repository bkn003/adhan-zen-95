import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNotifications } from './useNotifications';
import type { Prayer } from '@/types/prayer.types';

export const usePrayerNotifications = (prayers: Prayer[]) => {
  const { enabled, scheduleAdhanNotification } = useNotifications();

  useEffect(() => {
    // Skip web-based notifications on native platform - Android uses AlarmManager
    if (Capacitor.isNativePlatform()) {
      console.log('📱 Native platform detected - skipping web notifications (native AlarmManager handles this)');
      return;
    }

    if (!enabled || !prayers.length) return;

    // Schedule notifications for all prayers (web only)
    prayers.forEach(prayer => {
      if (prayer.type !== 'tarawih') { // Don't schedule for tarawih
        scheduleAdhanNotification(prayer.name, prayer.adhan, prayer.iqamah);
      }
    });
  }, [enabled, prayers, scheduleAdhanNotification]);

  return { enabled };
};