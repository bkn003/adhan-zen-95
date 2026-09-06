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

/** Local calendar date key — toISOString() would shift the day in IST. */
const localISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
  const dateISO = localISO(date);
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
  const dateISO = localISO(date);
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

/* ------------------------------------------------------------------ *
 * Synchronous snapshots (localStorage)
 * IndexedDB is async, so the very first paint would still be empty.
 * These mirrors let the app render the preferred mosque + today's
 * times instantly on startup, with or without internet.
 * ------------------------------------------------------------------ */

const SNAP_LOCATION = 'adhan_snapshot_location';
const SNAP_SCHEDULE = 'adhan_snapshot_schedule';

export function saveLocationSnapshot(location: any): void {
  try {
    localStorage.setItem(SNAP_LOCATION, JSON.stringify(location));
  } catch { /* quota */ }
}

export function readLocationSnapshot<T = any>(): T | null {
  try {
    const raw = localStorage.getItem(SNAP_LOCATION);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveScheduleSnapshot(locationId: string, date: Date, prayers: Prayer[], locationName?: string): void {
  try {
    localStorage.setItem(
      SNAP_SCHEDULE,
      JSON.stringify({ locationId, dateISO: localISO(date), prayers, locationName, timestamp: Date.now() })
    );
  } catch { /* quota */ }
}

/** Today's cached prayers for this mosque, or null when the snapshot is for another day/mosque. */
export function readScheduleSnapshot(locationId: string | undefined, date: Date): StoredSchedule | null {
  try {
    const raw = localStorage.getItem(SNAP_SCHEDULE);
    if (!raw) return null;
    const snap = JSON.parse(raw) as StoredSchedule;
    if (snap.dateISO !== localISO(date)) return null;
    if (locationId && snap.locationId !== locationId) return null;
    return snap.prayers?.length ? snap : null;
  } catch {
    return null;
  }
}
