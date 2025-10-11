import { set, get } from 'idb-keyval';
import type { Prayer } from '@/types/prayer.types';

export interface StoredSchedule {
  locationId: string;
  dateISO: string; // YYYY-MM-DD
  prayers: Prayer[];
}

const KEY_PREFIX = 'adhan_schedule_';

export async function saveDailySchedule(locationId: string, date: Date, prayers: Prayer[]) {
  const dateISO = date.toISOString().slice(0, 10);
  const key = `${KEY_PREFIX}${locationId}_${dateISO}`;
  const payload: StoredSchedule = { locationId, dateISO, prayers };
  await set(key, payload);
}

export async function loadDailySchedule(locationId: string, date: Date): Promise<StoredSchedule | undefined> {
  const dateISO = date.toISOString().slice(0, 10);
  const key = `${KEY_PREFIX}${locationId}_${dateISO}`;
  return get(key);
}
