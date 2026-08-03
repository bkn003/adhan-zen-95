/** Quiet hours: suppress local prayer reminders during a user-defined window. */
export interface QuietHours {
  enabled: boolean;
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

const KEY = 'quietHours';

export const defaultQuietHours: QuietHours = { enabled: false, start: '22:00', end: '05:00' };

export function loadQuietHours(): QuietHours {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultQuietHours;
    return { ...defaultQuietHours, ...JSON.parse(raw) };
  } catch {
    return defaultQuietHours;
  }
}

export function saveQuietHours(q: QuietHours) {
  localStorage.setItem(KEY, JSON.stringify(q));
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** True when the given time (default: now) falls inside the quiet window. */
export function inQuietHours(at: Date = new Date(), q: QuietHours = loadQuietHours()): boolean {
  if (!q.enabled) return false;
  const now = at.getHours() * 60 + at.getMinutes();
  const s = toMin(q.start);
  const e = toMin(q.end);
  return s <= e ? now >= s && now < e : now >= s || now < e; // handles overnight
}
