/**
 * Helpers to explain a prayer-time change in human terms:
 * how much moved, in which direction, and why it matters.
 */

export const toMinutes = (t?: string | null): number | null => {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
};

export type Direction = 'earlier' | 'later' | 'same' | 'unknown';

export interface Delta {
  minutes: number;
  direction: Direction;
  /** e.g. "5 min earlier" */
  text: string;
}

export const describeDelta = (from?: string | null, to?: string | null): Delta => {
  const a = toMinutes(from);
  const b = toMinutes(to);
  if (a === null || b === null) return { minutes: 0, direction: 'unknown', text: 'updated' };
  const diff = b - a;
  if (diff === 0) return { minutes: 0, direction: 'same', text: 'no change' };
  const abs = Math.abs(diff);
  const unit = abs === 1 ? 'min' : 'min';
  return {
    minutes: abs,
    direction: diff < 0 ? 'earlier' : 'later',
    text: `${abs} ${unit} ${diff < 0 ? 'earlier' : 'later'}`,
  };
};

/** Plain-language reason the change matters for the worshipper. */
export const impactText = (label: string, d: Delta): string => {
  const l = label.toLowerCase();
  if (d.direction === 'same' || d.direction === 'unknown') {
    return 'Recorded for transparency — your reminders were re-checked.';
  }
  const early = d.direction === 'earlier';
  if (l.includes('fajr')) {
    return early
      ? `Leave home ${d.minutes} min sooner — Fajr jamaat now starts earlier.`
      : `You get ${d.minutes} extra min before Fajr jamaat.`;
  }
  if (l.includes('jummah') || l.includes('jumma')) {
    return early
      ? `Friday khutbah starts ${d.minutes} min sooner — plan travel accordingly.`
      : `Friday khutbah is ${d.minutes} min later than before.`;
  }
  if (l.includes('sahar')) {
    return early
      ? `Stop eating ${d.minutes} min sooner during Ramadan.`
      : `You have ${d.minutes} more min for Sahar.`;
  }
  if (l.includes('ifthar') || l.includes('iftar') || l.includes('maghrib')) {
    return early
      ? `Iftar/Maghrib is ${d.minutes} min sooner — be ready earlier.`
      : `Iftar/Maghrib is ${d.minutes} min later than before.`;
  }
  if (l.includes('iqamah')) {
    return early
      ? `Jamaat starts ${d.minutes} min sooner — arrive earlier to avoid missing takbir.`
      : `You get ${d.minutes} more min to reach jamaat.`;
  }
  return early
    ? `Happens ${d.minutes} min sooner than before.`
    : `Happens ${d.minutes} min later than before.`;
};

export const deltaClasses = (d: Delta) =>
  d.direction === 'earlier'
    ? 'bg-rose-50 text-rose-600 border-rose-100'
    : d.direction === 'later'
      ? 'bg-sky-50 text-sky-600 border-sky-100'
      : 'bg-gray-50 text-gray-500 border-gray-100';
