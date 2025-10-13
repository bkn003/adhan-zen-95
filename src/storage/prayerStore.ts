import { set, get, del, keys } from 'idb-keyval';
import type { Prayer } from '@/types/prayer.types';

export interface StoredSchedule {
  locationId: string;
  dateISO: string; // YYYY-MM-DD
  prayers: Prayer[];
  timestamp: number; // when it was saved
  locationName?: string; // mosque name for reference
}

export interface StoredLocation {
  id: string;
  mosque_name: string;
  district: string;
  lastUsed: number;
}

const KEY_PREFIX = 'adhan_schedule_';
const LOCATION_KEY = 'adhan_selected_location';
const LOCATIONS_CACHE_KEY = 'adhan_locations_cache';

// Save daily prayer schedule for offline use
export async function saveDailySchedule(
  locationId: string, 
  date: Date, 
  prayers: Prayer[], 
  locationName?: string
): Promise<void> {
  const dateISO = date.toISOString().slice(0, 10);
  const key = `${KEY_PREFIX}${locationId}_${dateISO}`;
  const payload: StoredSchedule = { 
    locationId, 
    dateISO, 
    prayers,
    timestamp: Date.now(),
    locationName
  };
  await set(key, payload);
  console.log('💾 Saved prayer schedule to IndexedDB:', key);
}

// Load daily prayer schedule from offline storage
export async function loadDailySchedule(locationId: string, date: Date): Promise<StoredSchedule | undefined> {
  const dateISO = date.toISOString().slice(0, 10);
  const key = `${KEY_PREFIX}${locationId}_${dateISO}`;
  const data = await get(key);
  if (data) {
    console.log('📖 Loaded prayer schedule from IndexedDB:', key);
  }
  return data;
}

// Save selected location for persistence
export async function saveSelectedLocation(location: { id: string; mosque_name: string; district: string }): Promise<void> {
  const payload: StoredLocation = {
    ...location,
    lastUsed: Date.now()
  };
  await set(LOCATION_KEY, payload);
}

// Load selected location
export async function loadSelectedLocation(): Promise<StoredLocation | undefined> {
  return get(LOCATION_KEY);
}

// Cache all locations for offline access
export async function cacheLocations(locations: any[]): Promise<void> {
  await set(LOCATIONS_CACHE_KEY, {
    locations,
    timestamp: Date.now()
  });
  console.log('💾 Cached', locations.length, 'locations to IndexedDB');
}

// Load cached locations
export async function loadCachedLocations(): Promise<any[] | undefined> {
  const data = await get(LOCATIONS_CACHE_KEY) as { locations: any[], timestamp: number } | undefined;
  if (data) {
    console.log('📖 Loaded', data.locations.length, 'locations from IndexedDB cache');
    return data.locations;
  }
  return undefined;
}

// Clean up old schedules (older than 7 days)
export async function cleanOldSchedules(): Promise<void> {
  const allKeys = await keys();
  const scheduleKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(KEY_PREFIX));
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  for (const key of scheduleKeys) {
    const data = await get(key) as StoredSchedule | undefined;
    if (data && data.timestamp < sevenDaysAgo) {
      await del(key);
      console.log('🗑️ Cleaned old schedule:', key);
    }
  }
}
