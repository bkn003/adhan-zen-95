import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { loadDailySchedule, saveDailySchedule } from '@/storage/prayerStore';
import { scheduleTodayAdhanNotifications } from './useNativeAdhanScheduler';
import type { Prayer } from '@/types/prayer.types';

/**
 * Service to manage offline Adhan notifications
 * Loads prayer times from IndexedDB and schedules native notifications
 */

// Check if we have offline data and schedule notifications
export async function scheduleOfflineAdhanIfNeeded(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('⚠️ Not a native platform, skipping offline Adhan scheduling');
    return false;
  }

  try {
    // Try to get location from localStorage
    const locationId = localStorage.getItem('selectedLocationId');
    if (!locationId) {
      console.log('⚠️ No location selected, cannot schedule offline Adhan');
      return false;
    }

    // Load today's prayer schedule from IndexedDB
    const today = new Date();
    const schedule = await loadDailySchedule(locationId, today);
    
    if (!schedule || !schedule.prayers || schedule.prayers.length === 0) {
      console.log('⚠️ No offline prayer schedule found for today');
      return false;
    }

    console.log('📱 Found offline prayer schedule, scheduling Adhan notifications');
    await scheduleTodayAdhanNotifications(schedule.prayers, today);
    
    return true;
  } catch (error) {
    console.error('❌ Error scheduling offline Adhan:', error);
    return false;
  }
}

// Initialize offline service - call this on app startup
export async function initializeOfflineAdhanService(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  console.log('🚀 Initializing offline Adhan service...');
  
  // Request notification permissions
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      const result = await LocalNotifications.requestPermissions();
      if (result.display !== 'granted') {
        console.warn('⚠️ Notification permission not granted');
        return;
      }
    }
  } catch (error) {
    console.error('❌ Error requesting notification permissions:', error);
    return;
  }

  // Try to schedule from offline data
  await scheduleOfflineAdhanIfNeeded();
}

// Save prayer times for future offline use
export async function saveForOfflineUse(
  locationId: string,
  date: Date,
  prayers: Prayer[],
  locationName?: string
): Promise<void> {
  try {
    await saveDailySchedule(locationId, date, prayers, locationName);
    console.log('✅ Saved prayer times for offline use');
    
    // If we're on native platform, also schedule notifications
    if (Capacitor.isNativePlatform()) {
      await scheduleTodayAdhanNotifications(prayers, date);
    }
  } catch (error) {
    console.error('❌ Error saving for offline use:', error);
  }
}

// Get pending notifications (for debugging)
export async function getPendingNotifications(): Promise<any[]> {
  if (!Capacitor.isNativePlatform()) return [];
  
  try {
    const result = await LocalNotifications.getPending();
    console.log('📋 Pending notifications:', result.notifications.length);
    return result.notifications;
  } catch (error) {
    console.error('❌ Error getting pending notifications:', error);
    return [];
  }
}
