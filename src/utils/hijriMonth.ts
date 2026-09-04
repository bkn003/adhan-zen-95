/**
 * Hijri label for a whole Gregorian month, used in exported PDF/ICS headers.
 * Aladhan's gToH endpoint is queried for the first and last day of the month and
 * the result is cached in localStorage (a Gregorian→Hijri mapping never changes
 * for a past/known date, so a long cache is safe).
 */

const CACHE_PREFIX = 'hijri_month_label_';

const adjustment = () => {
  const saved = localStorage.getItem('hijriAdjustment');
  return saved !== null ? parseInt(saved, 10) || 0 : -1;
};

const fmt = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

async function gToH(date: Date): Promise<{ day: string; month: string; year: string } | null> {
  try {
    const res = await fetch(`https://api.aladhan.com/v1/gToH/${fmt(date)}`, { cache: 'force-cache' });
    if (!res.ok) return null;
    const json = await res.json();
    const h = json?.data?.hijri;
    if (!h) return null;
    return { day: h.day, month: h.month?.en ?? '', year: h.year };
  } catch {
    return null;
  }
}

/** e.g. "Ramadan 1447 – Shawwal 1447" or "Sha'ban 1447". Empty string when unavailable. */
export async function getHijriMonthLabel(monthIndex: number, year: number): Promise<string> {
  const key = `${CACHE_PREFIX}${year}_${monthIndex}_${adjustment()}`;
  const cached = localStorage.getItem(key);
  if (cached) return cached;

  const shift = adjustment() * 24 * 3600 * 1000;
  const first = new Date(new Date(year, monthIndex, 1).getTime() + shift);
  const last = new Date(new Date(year, monthIndex + 1, 0).getTime() + shift);

  const [a, b] = await Promise.all([gToH(first), gToH(last)]);
  if (!a && !b) return '';

  const start = a ? `${a.day} ${a.month} ${a.year}` : '';
  const end = b ? `${b.day} ${b.month} ${b.year}` : '';
  const label =
    a && b
      ? a.month === b.month && a.year === b.year
        ? `${a.day}–${b.day} ${a.month} ${a.year}`
        : `${start} – ${end}`
      : start || end;

  try { localStorage.setItem(key, label); } catch { /* quota */ }
  return label;
}
