/**
 * Year-long offline alarms.
 *
 * Builds a full year of Adhan/Iqamah timings for a mosque from the CDN month
 * JSONs (never Supabase directly), stores it on the phone, and hands it to the
 * native layer which keeps a rolling 30-day window of exact alarms armed —
 * so alarms keep ringing for years with no internet and the app never opened.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { loadMonthEntries } from '@/utils/prayerTimesSource';
import type { StaticPrayerTime } from '@/utils/staticPrayerTimes';

interface YearAlarmPlugin {
  setYearSchedule(o: { days: Record<string, DaySlot[]> }): Promise<{ storedDays: number; armedAlarms: number }>;
  refillYearAlarms(): Promise<{ armedAlarms: number }>;
  getYearAlarmStatus(): Promise<{ storedDays: number; savedAt: number; windowDays: number }>;
  clearYearAlarms(): Promise<void>;
}

const AdhanNative = registerPlugin<YearAlarmPlugin>('AdhanNative');

export interface DaySlot {
  name: string;
  adhan: string;
  iqamah: string;
  type: string;
}

const LAST_SYNC_KEY = 'adhan_year_alarm_sync';
const YEAR_CACHE_KEY = 'adhan_year_schedule';

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const PRAYERS: Array<{ name: string; type: string; adhan: keyof StaticPrayerTime; iqamah: keyof StaticPrayerTime }> = [
  { name: 'Fajr', type: 'fajr', adhan: 'fajr', iqamah: 'fajr_iqamah' },
  { name: 'Zuhr', type: 'dhuhr', adhan: 'dhuhr', iqamah: 'dhuhr_iqamah' },
  { name: 'Asr', type: 'asr', adhan: 'asr', iqamah: 'asr_iqamah' },
  { name: 'Maghrib', type: 'maghrib', adhan: 'maghrib', iqamah: 'maghrib_iqamah' },
  { name: 'Isha', type: 'isha', adhan: 'isha', iqamah: 'isha_iqamah' },
];

function entryForDate(entries: StaticPrayerTime[], dateISO: string): StaticPrayerTime | null {
  return (
    entries.find((e) => e.date === dateISO) ||
    entries.find((e) => e.date_from && e.date_to && dateISO >= e.date_from && dateISO <= e.date_to) ||
    null
  );
}

function slotsFor(entry: StaticPrayerTime): DaySlot[] {
  return PRAYERS.map(({ name, type, adhan, iqamah }) => ({
    name,
    type,
    adhan: String(entry[adhan] ?? '').slice(0, 5),
    iqamah: String(entry[iqamah] ?? '').slice(0, 5),
  })).filter((s) => s.adhan || s.iqamah);
}

/** Build a 12-month day-by-day map of prayer slots for one mosque. */
export async function buildYearSchedule(
  mosqueName: string,
  locationId: string | null
): Promise<Record<string, DaySlot[]>> {
  const today = new Date();
  const monthEntries = new Map<string, StaticPrayerTime[]>();

  for (let i = 0; i < 12; i++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const key = `${monthDate.getFullYear()}-${pad(monthDate.getMonth() + 1)}`;
    try {
      monthEntries.set(key, await loadMonthEntries(mosqueName, locationId, monthDate));
    } catch {
      monthEntries.set(key, []);
    }
  }

  const days: Record<string, DaySlot[]> = {};
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let d = 0; d < 366; d++) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() + d);
    const monthKey = `${day.getFullYear()}-${pad(day.getMonth() + 1)}`;
    const entries = monthEntries.get(monthKey);
    if (!entries?.length) continue;
    const dateISO = iso(day);
    const entry = entryForDate(entries, dateISO);
    if (!entry) continue;
    const slots = slotsFor(entry);
    if (slots.length) days[dateISO] = slots;
  }
  return days;
}

export interface YearSyncResult {
  storedDays: number;
  armedAlarms: number;
  native: boolean;
  syncedAt: number;
}

/** Download a year of timings, cache them, and arm native alarms. */
export async function syncYearAlarms(
  mosqueName: string,
  locationId: string | null
): Promise<YearSyncResult> {
  const days = await buildYearSchedule(mosqueName, locationId);
  const storedDays = Object.keys(days).length;
  if (!storedDays) throw new Error('No prayer timings available to download yet.');

  try {
    localStorage.setItem(YEAR_CACHE_KEY, JSON.stringify({ mosqueName, locationId, days }));
  } catch { /* quota */ }

  let armedAlarms = 0;
  let native = false;
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await AdhanNative.setYearSchedule({ days });
      armedAlarms = res?.armedAlarms ?? 0;
      native = true;
    } catch (e) {
      console.warn('setYearSchedule failed:', e);
    }
  }

  const syncedAt = Date.now();
  try {
    localStorage.setItem(
      LAST_SYNC_KEY,
      JSON.stringify({ mosqueName, locationId, storedDays, armedAlarms, syncedAt })
    );
  } catch { /* quota */ }

  return { storedDays, armedAlarms, native, syncedAt };
}

export function readYearAlarmStatus(): (YearSyncResult & { mosqueName?: string }) | null {
  try {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Locally cached year of timings (offline reads without native). */
export function readCachedYearSchedule(): Record<string, DaySlot[]> | null {
  try {
    const raw = localStorage.getItem(YEAR_CACHE_KEY);
    return raw ? (JSON.parse(raw).days as Record<string, DaySlot[]>) : null;
  } catch {
    return null;
  }
}

/** Top the native alarm window back up (safe on web — resolves silently). */
export async function refillYearAlarms(): Promise<number> {
  if (!Capacitor.isNativePlatform()) return 0;
  try {
    const res = await AdhanNative.refillYearAlarms();
    return res?.armedAlarms ?? 0;
  } catch {
    return 0;
  }
}

const STALE_MS = 45 * 24 * 60 * 60 * 1000; // refresh the year roughly every 6 weeks

/**
 * Startup maintenance: always top up the native alarm window, and quietly
 * re-download the year when it is missing or getting old. Never throws.
 */
export async function autoMaintainYearAlarms(
  mosqueName?: string | null,
  locationId?: string | null
): Promise<void> {
  try {
    await refillYearAlarms();
    if (!mosqueName) return;
    const status = readYearAlarmStatus();
    const stale =
      !status ||
      status.mosqueName !== mosqueName ||
      Date.now() - (status.syncedAt ?? 0) > STALE_MS;
    if (!stale) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const res = await syncYearAlarms(mosqueName, locationId ?? null);
    console.log(`🗓️ Year alarms refreshed: ${res.storedDays} days, ${res.armedAlarms} armed`);
  } catch (e) {
    console.warn('Year alarm maintenance skipped:', e);
  }
}
