import { Capacitor, registerPlugin } from '@capacitor/core';
import { createLocationSlug, getMonthString, fetchStaticPrayerTimes, getPrayerTimesForDate, type StaticPrayerTime } from '@/utils/staticPrayerTimes';
import { loadEntriesForWindow, findLocationIdByName } from '@/utils/prayerTimesSource';
import { loadPrayerNotificationPrefs, isEnabled } from '@/native/prayerNotificationPrefs';

export interface SyncChange {
  date: string;      // YYYY-MM-DD
  field: string;     // machine field name
  label: string;     // pretty field name
  from: string;
  to: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: number | null;
  mosqueName: string | null;
  changes: SyncChange[];
  error?: string | null;
  scheduledCount?: number;
}

const K = {
  at: 'sync:lastAt',
  status: 'sync:status',
  changes: 'sync:changes',
  snapshot: 'sync:snapshot',
  mosque: 'sync:mosque',
  error: 'sync:error',
  locationId: 'sync:locationId',
};

const TRACKED: Array<[keyof StaticPrayerTime | string, string]> = [
  ['fajr', 'Fajr Adhan'],
  ['fajr_iqamah', 'Fajr Iqamah'],
  ['dhuhr', 'Zuhr Adhan'],
  ['dhuhr_iqamah', 'Zuhr Iqamah'],
  ['asr', 'Asr Adhan'],
  ['asr_iqamah', 'Asr Iqamah'],
  ['maghrib', 'Maghrib Adhan'],
  ['maghrib_iqamah', 'Maghrib Iqamah'],
  ['isha', 'Isha Adhan'],
  ['isha_iqamah', 'Isha Iqamah'],
  ['jummah_adhan', 'Jummah Adhan'],
  ['jummah_iqamah', 'Jummah Iqamah'],
  ['sahar_end', 'Sahar End'],
  ['ifthar_time', 'Iftar'],
  ['tharaweeh', 'Tharaweeh'],
  ['fajr_ramadan_iqamah', 'Fajr Iqamah (Ramadan)'],
  ['isha_ramadan_iqamah', 'Isha Iqamah (Ramadan)'],
  ['maghrib_ramadan_adhan', 'Maghrib Adhan (Ramadan)'],
];

const listeners = new Set<(s: SyncState) => void>();

export function getSyncState(): SyncState {
  let changes: SyncChange[] = [];
  try { changes = JSON.parse(localStorage.getItem(K.changes) || '[]'); } catch { /* noop */ }
  const at = localStorage.getItem(K.at);
  return {
    status: (localStorage.getItem(K.status) as SyncStatus) || 'idle',
    lastSyncAt: at ? Number(at) : null,
    mosqueName: localStorage.getItem(K.mosque),
    changes,
    error: localStorage.getItem(K.error),
  };
}

function setState(patch: Partial<SyncState>) {
  if (patch.status !== undefined) localStorage.setItem(K.status, patch.status);
  if (patch.lastSyncAt !== undefined && patch.lastSyncAt !== null) localStorage.setItem(K.at, String(patch.lastSyncAt));
  if (patch.mosqueName) localStorage.setItem(K.mosque, patch.mosqueName);
  if (patch.changes !== undefined) localStorage.setItem(K.changes, JSON.stringify(patch.changes));
  if (patch.error !== undefined) {
    if (patch.error) localStorage.setItem(K.error, patch.error);
    else localStorage.removeItem(K.error);
  }
  const s = getSyncState();
  listeners.forEach((l) => l(s));
  window.dispatchEvent(new CustomEvent('prayer-sync-state', { detail: s }));
}

export function subscribeSyncState(cb: (s: SyncState) => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function formatRelative(ts: number | null): string {
  if (!ts) return 'never';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildWindow(entries: StaticPrayerTime[], days = 7): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  const base = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const entry = getPrayerTimesForDate(entries, d);
    if (!entry) continue;
    const slim: Record<string, string> = {};
    for (const [field] of TRACKED) {
      const v = (entry as unknown as Record<string, unknown>)[field as string];
      if (typeof v === 'string' && v) slim[field as string] = v;
    }
    out[isoDate(d)] = slim;
  }
  return out;
}

function diffWindows(prev: Record<string, Record<string, string>>, next: Record<string, Record<string, string>>): SyncChange[] {
  const changes: SyncChange[] = [];
  for (const date of Object.keys(next)) {
    const a = prev[date];
    const b = next[date];
    if (!a) continue;
    for (const [field, label] of TRACKED) {
      const from = a[field as string];
      const to = b[field as string];
      if (from && to && from !== to) changes.push({ date, field: field as string, label, from, to });
    }
  }
  return changes;
}

// ---- Native bridges -------------------------------------------------------

interface NativeSyncPlugin {
  refreshPrayerTimes(): Promise<{ success: boolean }>;
  scheduleReliableAlarms(opts: { prayers: Array<{ name: string; adhan: string; iqamah: string; type: string }>; date: string }): Promise<{ scheduledCount: number }>;
}
const AdhanNative = registerPlugin<NativeSyncPlugin>('AdhanNative');

/**
 * iOS (and any Capacitor platform without the Android WorkManager pipeline):
 * pre-schedule local notifications for the next 7 days so adhan / iqamah alerts
 * fire even when the app is never opened. iOS keeps up to 64 pending
 * notifications, so 7 days x ~9 alerts stays within budget.
 */
async function scheduleLocalNotifications(entries: StaticPrayerTime[]) {
  if (!Capacitor.isNativePlatform()) return 0;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') return 0;

  const pending = await LocalNotifications.getPending();
  const ours = pending.notifications.filter((n) => n.id >= 900000);
  if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });

  const prefs = loadPrayerNotificationPrefs();
  const base = new Date();
  const toSchedule: Array<{ id: number; title: string; body: string; schedule: { at: Date; allowWhileIdle: boolean } }> = [];
  let id = 900001;

  for (let day = 0; day < 7; day++) {
    const d = new Date(base);
    d.setDate(base.getDate() + day);
    const e = getPrayerTimesForDate(entries, d);
    if (!e) continue;
    const rows: Array<[string, string, 'adhan' | 'iqamah', string]> = [
      ['fajr', e.fajr, 'adhan', 'Fajr'],
      ['fajr', e.fajr_iqamah || '', 'iqamah', 'Fajr'],
      ['dhuhr', e.dhuhr, 'adhan', 'Zuhr'],
      ['dhuhr', e.dhuhr_iqamah || '', 'iqamah', 'Zuhr'],
      ['asr', e.asr, 'adhan', 'Asr'],
      ['asr', e.asr_iqamah || '', 'iqamah', 'Asr'],
      ['maghrib', e.maghrib, 'adhan', 'Maghrib'],
      ['maghrib', e.maghrib_iqamah || '', 'iqamah', 'Maghrib'],
      ['isha', e.isha, 'adhan', 'Isha'],
      ['isha', e.isha_iqamah || '', 'iqamah', 'Isha'],
    ];
    for (const [key, time, phase, label] of rows) {
      if (!time || !isEnabled(prefs, key, phase)) continue;
      const at = parseTimeOn(d, time);
      if (!at || at.getTime() <= Date.now()) continue;
      toSchedule.push({
        id: id++,
        title: phase === 'adhan' ? `🕌 ${label} Adhan` : `🤲 ${label} Iqamah`,
        body: `${label} ${phase} at ${time}`,
        schedule: { at, allowWhileIdle: true },
      });
    }
    if (prefs.ramadan) {
      const ram: Array<[string, string]> = [
        ['Sahar ends', e.sahar_end || ''],
        ['Iftar', e.ifthar_time || ''],
        ['Tharaweeh', e.tharaweeh || ''],
      ];
      for (const [label, time] of ram) {
        if (!time) continue;
        const at = parseTimeOn(d, time);
        if (!at || at.getTime() <= Date.now()) continue;
        toSchedule.push({ id: id++, title: `🌙 ${label}`, body: `${label} at ${time}`, schedule: { at, allowWhileIdle: true } });
      }
    }
  }

  const capped = toSchedule.slice(0, 60);
  if (capped.length) await LocalNotifications.schedule({ notifications: capped as never });
  return capped.length;
}

function parseTimeOn(day: Date, time: string): Date | null {
  const t = time.trim();
  const m = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3]?.toLowerCase();
  if (mer === 'pm' && h < 12) h += 12;
  if (mer === 'am' && h === 12) h = 0;
  const d = new Date(day);
  d.setHours(h, min, 0, 0);
  return d;
}

// ---- Public sync entrypoint ----------------------------------------------

let running = false;

export async function runPrayerSync(mosqueName?: string, locationId?: string | null): Promise<SyncState> {
  const name = mosqueName || localStorage.getItem(K.mosque) || '';
  if (!name) return getSyncState();
  if (running) return getSyncState();
  running = true;

  if (!navigator.onLine) {
    setState({ status: 'offline', mosqueName: name });
    running = false;
    return getSyncState();
  }

  setState({ status: 'syncing', mosqueName: name, error: null });
  try {
    let locId = locationId ?? localStorage.getItem(K.locationId);
    if (!locId) {
      locId = await findLocationIdByName(name);
      if (locId) localStorage.setItem(K.locationId, locId);
    }

    // Static JSON first, then cache, then the Supabase table — mosques without a
    // generated JSON export used to fail here with "Sync failed".
    // A 10-day window always spans the next weekly date-range switch.
    const entries = await loadEntriesForWindow(name, locId, 10);
    if (!entries.length) throw new Error('No prayer times published for this mosque yet');

    const next = buildWindow(entries, 10);
    let prev: Record<string, Record<string, string>> = {};
    try { prev = JSON.parse(localStorage.getItem(K.snapshot) || '{}'); } catch { /* noop */ }
    const changes = diffWindows(prev, next);
    localStorage.setItem(K.snapshot, JSON.stringify(next));

    // Keep native pipelines in step
    if (Capacitor.isNativePlatform()) {
      if (Capacitor.getPlatform() === 'android') {
        try { await AdhanNative.refreshPrayerTimes(); } catch { /* noop */ }
      } else {
        await scheduleLocalNotifications(entries);
      }
    }

    if (changes.length) notifyChanges(name, changes);

    setState({
      status: 'success',
      lastSyncAt: Date.now(),
      mosqueName: name,
      changes: changes.length ? changes : getSyncState().changes,
      error: null,
    });
  } catch (e) {
    setState({ status: 'error', mosqueName: name, error: e instanceof Error ? e.message : 'Sync failed' });
  } finally {
    running = false;
  }
  return getSyncState();
}

/** Surface weekly timing changes even if the user never opens the sync screen. */
function notifyChanges(name: string, changes: SyncChange[]) {
  try {
    const head = changes.slice(0, 3).map(c => `${c.label}: ${c.from} → ${c.to}`).join(', ');
    const body = `${head}${changes.length > 3 ? ` +${changes.length - 3} more` : ''}`;
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(`🕌 ${name} — prayer times updated`, { body, tag: 'prayer-change' });
    }
  } catch { /* noop */ }
}

/** Start automatic syncing: on launch, on resume/online, and every 6 hours. */
export function startAutoSync(mosqueName: string, locationId?: string | null) {
  setState({ mosqueName });
  if (locationId) localStorage.setItem(K.locationId, locationId);
  const run = () => void runPrayerSync(mosqueName, locationId ?? null);
  run();

  const onVisible = () => { if (document.visibilityState === 'visible') run(); };
  const onOnline = () => run();
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);
  const iv = window.setInterval(run, 6 * 60 * 60 * 1000);

  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onOnline);
    clearInterval(iv);
  };
}

