/**
 * Unified prayer-time loader.
 *
 * Order of preference (per memory: CDN JSON first, Supabase only as a fallback):
 *   1. Cloudflare / local static JSON  (`/prayer_times/<slug>/<YYYY-MM>.json`)
 *   2. localStorage cache written by earlier successful fetches
 *   3. Supabase `prayer_times` rows for that mosque + month
 *
 * The Supabase fallback exists because JSON exports are only generated for
 * mosques that have been through the export workflow — without it background
 * sync fails with "Failed to fetch prayer times from any source".
 */
import { supabase } from '@/integrations/supabase/client';
import {
  createLocationSlug,
  getMonthString,
  fetchStaticPrayerTimes,
  type StaticPrayerTime,
} from '@/utils/staticPrayerTimes';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const trim = (t?: string | null) => (t ? String(t).slice(0, 5) : undefined);

export const daysInMonth = (year: number, month1: number) => new Date(year, month1, 0).getDate();

/**
 * Parse a stored `date_range` ("1-5", "24-31 Aug", "6-11 Feb") into concrete
 * start/end days, clamping the end day to the real length of that month so
 * February resolves to 24-28 / 24-29 and April to 24-30.
 */
export function resolveRange(dateRange: string, year: number, month1: number): { from: number; to: number } | null {
  const m = dateRange.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})/);
  if (!m) return null;
  const from = parseInt(m[1], 10);
  const to = Math.min(parseInt(m[2], 10), daysInMonth(year, month1));
  if (!from || !to || to < from) return null;
  return { from, to };
}

function rowToEntry(r: Record<string, any>, year: number, month1: number): StaticPrayerTime | null {
  const range = resolveRange(String(r.date_range || ''), year, month1);
  if (!range) return null;
  return {
    date_from: iso(year, month1, range.from),
    date_to: iso(year, month1, range.to),
    location: r.location_id,
    fajr: trim(r.fajr_adhan) || '',
    fajr_iqamah: trim(r.fajr_iqamah),
    dhuhr: trim(r.dhuhr_adhan) || '',
    dhuhr_iqamah: trim(r.dhuhr_iqamah),
    asr: trim(r.asr_adhan) || '',
    asr_iqamah: trim(r.asr_iqamah),
    maghrib: trim(r.maghrib_adhan) || '',
    maghrib_iqamah: trim(r.maghrib_iqamah),
    isha: trim(r.isha_adhan) || '',
    isha_iqamah: trim(r.isha_iqamah),
    jummah_adhan: trim(r.jummah_adhan),
    jummah_iqamah: trim(r.jummah_iqamah),
    sun_rise: trim(r.sun_rise),
    sun_set: trim(r.sun_set),
    mid_noon: trim(r.mid_noon),
    sahar_end: trim(r.sahar_end),
    tharaweeh: trim(r.tharaweeh),
    ifthar_time: trim(r.ifthar_time),
    fajr_ramadan_iqamah: trim(r.fajr_ramadan_iqamah),
    isha_ramadan_iqamah: trim(r.isha_ramadan_iqamah),
    maghrib_ramadan_adhan: trim(r.maghrib_ramadan_adhan),
  } as StaticPrayerTime;
}

async function fromSupabase(locationId: string, year: number, month1: number): Promise<StaticPrayerTime[]> {
  const { data, error } = await supabase
    .from('prayer_times')
    .select('*')
    .eq('location_id', locationId)
    .eq('month', MONTH_NAMES[month1 - 1]);
  if (error || !data?.length) return [];
  return data
    .map((r) => rowToEntry(r as Record<string, any>, year, month1))
    .filter((e): e is StaticPrayerTime => !!e)
    .sort((a, b) => String(a.date_from).localeCompare(String(b.date_from)));
}

const cacheKey = (slug: string, month: string) => `pt:${slug}:${month}`;

/** Load one month of entries for a mosque, trying every available source. */
export async function loadMonthEntries(
  mosqueName: string,
  locationId: string | null,
  date: Date
): Promise<StaticPrayerTime[]> {
  const slug = createLocationSlug(mosqueName);
  const month = getMonthString(date);

  try {
    const entries = await fetchStaticPrayerTimes(slug, month);
    if (entries?.length) {
      try { localStorage.setItem(cacheKey(slug, month), JSON.stringify({ times: entries, at: Date.now() })); } catch { /* quota */ }
      return entries;
    }
  } catch { /* fall through */ }

  try {
    const raw = localStorage.getItem(cacheKey(slug, month));
    const cached = raw ? (JSON.parse(raw).times as StaticPrayerTime[]) : null;
    if (cached?.length) return cached;
  } catch { /* noop */ }

  if (locationId) {
    const rows = await fromSupabase(locationId, date.getFullYear(), date.getMonth() + 1);
    if (rows.length) {
      try { localStorage.setItem(cacheKey(slug, month), JSON.stringify({ times: rows, at: Date.now() })); } catch { /* quota */ }
      return rows;
    }
  }

  return [];
}

/**
 * Load enough entries to cover `days` ahead of today, spanning into next month
 * when the window crosses a month boundary (prayer times change weekly, so the
 * window must always reach past the next date-range switch).
 */
export async function loadEntriesForWindow(
  mosqueName: string,
  locationId: string | null,
  days = 10
): Promise<StaticPrayerTime[]> {
  const today = new Date();
  const end = new Date(today);
  end.setDate(today.getDate() + days);

  const current = await loadMonthEntries(mosqueName, locationId, today);
  if (end.getMonth() === today.getMonth()) return current;

  const next = await loadMonthEntries(mosqueName, locationId, end);
  return [...current, ...next];
}

/** Resolve a mosque's location id from its name (used by background sync). */
export async function findLocationIdByName(mosqueName: string): Promise<string | null> {
  const { data } = await supabase
    .from('locations')
    .select('id')
    .eq('mosque_name', mosqueName)
    .maybeSingle();
  return data?.id ?? null;
}
