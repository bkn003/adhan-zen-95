/**
 * Median.co JavaScript Bridge Integration
 * Handles native notifications and audio playback via Median's AppMaker
 */

import type { Prayer } from '@/types/prayer.types';

// Extend window type for Median API
declare global {
  interface Window {
    median?: {
      notifications?: {
        schedule: (notification: MedianNotification) => void;
        scheduleMultiple: (notifications: MedianNotification[]) => void;
        cancel: (id: string) => void;
        cancelAll: () => void;
        getPending: () => Promise<MedianNotification[]>;
      };
      deviceInfo?: {
        platform: string;
        version: string;
      };
    };
    saveTodayPrayerTimes?: (times: PrayerTimesData) => void;
  }
}

interface MedianNotification {
  id: string;
  title: string;
  body: string;
  time: string; // HH:mm format
  sound?: string;
  recurring?: boolean;
  vibrate?: boolean;
  priority?: 'high' | 'default' | 'low';
}

interface PrayerTimesData {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jummah?: string;
}

/**
 * Check if running in Median.co native app
 */
export function isMedianApp(): boolean {
  return typeof window !== 'undefined' && !!window.median;
}

/**
 * Schedule Adhan notifications via Median.co native bridge
 */
export function scheduleAdhanWithMedian(prayers: Prayer[], date: Date = new Date()): boolean {
  if (!isMedianApp() || !window.median?.notifications) {
    console.log('⚠️ Median.co bridge not available');
    return false;
  }

  try {
    const now = new Date();
    const notifications: MedianNotification[] = [];
    
    // Filter to main 5 prayers
    const mainPrayers: Prayer['type'][] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    
    prayers.forEach((prayer) => {
      if (!mainPrayers.includes(prayer.type)) return;
      
      // Parse prayer time
      const prayerTime = parseTimeToDate(prayer.adhan, date);
      
      // Only schedule future prayers
      if (prayerTime > now) {
        notifications.push({
          id: `prayer_${prayer.type}_${date.getTime()}`,
          title: `${prayer.name} Adhan`,
          body: "It's time for prayer",
          time: prayer.adhan,
          sound: 'azan1', // References bundled audio in Median assets
          recurring: false,
          vibrate: true,
          priority: 'high'
        });
      }
    });

    // Schedule Jummah if Friday
    if (date.getDay() === 5) {
      const jummah = prayers.find(p => p.type === 'jummah');
      if (jummah) {
        const jummahTime = parseTimeToDate(jummah.adhan, date);
        if (jummahTime > now) {
          notifications.push({
            id: `prayer_jummah_${date.getTime()}`,
            title: 'Jummah Adhan',
            body: "It's time for Friday prayer",
            time: jummah.adhan,
            sound: 'azan1',
            recurring: false,
            vibrate: true,
            priority: 'high'
          });
        }
      }
    }

    if (notifications.length > 0) {
      window.median.notifications.scheduleMultiple(notifications);
      console.log(`✅ Scheduled ${notifications.length} Adhan notifications via Median`);
      return true;
    } else {
      console.log('⚠️ No future prayers to schedule today');
      return false;
    }
  } catch (error) {
    console.error('❌ Error scheduling via Median:', error);
    return false;
  }
}

/**
 * Save prayer times for boot recovery
 * Median will read this on device boot to reschedule
 */
export function savePrayerTimesForBoot(prayers: Prayer[]): void {
  try {
    const prayerData = {
      prayers: prayers.map(p => ({
        name: p.name,
        adhan: p.adhan,
        type: p.type
      })),
      date: new Date().toISOString()
    };
    
    localStorage.setItem('median_prayer_data', JSON.stringify(prayerData));
    console.log('💾 Saved prayer times for boot recovery');
  } catch (error) {
    console.error('❌ Failed to save prayer data:', error);
  }
}

/**
 * Alternative API: window.saveTodayPrayerTimes (for Median compatibility)
 * Some Median templates use this specific function name
 */
export function registerMedianPrayerTimesSaver(prayers: Prayer[]): void {
  if (typeof window === 'undefined') return;

  const prayerTimes: PrayerTimesData = {
    fajr: prayers.find(p => p.type === 'fajr')?.adhan || '',
    dhuhr: prayers.find(p => p.type === 'dhuhr')?.adhan || '',
    asr: prayers.find(p => p.type === 'asr')?.adhan || '',
    maghrib: prayers.find(p => p.type === 'maghrib')?.adhan || '',
    isha: prayers.find(p => p.type === 'isha')?.adhan || '',
    jummah: prayers.find(p => p.type === 'jummah')?.adhan
  };

  // Call Median's native bridge if available
  if (window.saveTodayPrayerTimes) {
    window.saveTodayPrayerTimes(prayerTimes);
    console.log('✅ Registered prayer times with Median native bridge');
  }
}

/**
 * Cancel all scheduled Adhan notifications
 */
export function cancelAllAdhanNotifications(): boolean {
  if (!isMedianApp() || !window.median?.notifications) {
    return false;
  }

  try {
    window.median.notifications.cancelAll();
    console.log('🗑️ Cancelled all Adhan notifications');
    return true;
  } catch (error) {
    console.error('❌ Failed to cancel notifications:', error);
    return false;
  }
}

/**
 * Get pending notifications (for debugging)
 */
export async function getPendingMedianNotifications(): Promise<MedianNotification[]> {
  if (!isMedianApp() || !window.median?.notifications) {
    return [];
  }

  try {
    const pending = await window.median.notifications.getPending();
    console.log(`📋 ${pending.length} pending Median notifications`);
    return pending;
  } catch (error) {
    console.error('❌ Failed to get pending notifications:', error);
    return [];
  }
}

/**
 * Reschedule prayers after device boot
 * This should be called on app startup in Median apps
 */
export function rescheduleAfterBoot(): boolean {
  if (!isMedianApp()) return false;

  try {
    const stored = localStorage.getItem('median_prayer_data');
    if (!stored) {
      console.log('⚠️ No stored prayer data for boot recovery');
      return false;
    }

    const { prayers, date: dateStr } = JSON.parse(stored);
    const storedDate = new Date(dateStr);
    const today = new Date();

    // Check if stored data is for today
    const isSameDay = 
      storedDate.getDate() === today.getDate() &&
      storedDate.getMonth() === today.getMonth() &&
      storedDate.getFullYear() === today.getFullYear();

    if (!isSameDay) {
      console.log('⚠️ Stored prayer times are not for today');
      return false;
    }

    console.log('🔄 Rescheduling prayers after boot...');
    return scheduleAdhanWithMedian(prayers, today);
  } catch (error) {
    console.error('❌ Failed to reschedule after boot:', error);
    return false;
  }
}

// Helper function to parse time string to Date
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
