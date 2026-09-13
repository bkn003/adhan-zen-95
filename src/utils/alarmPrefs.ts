/** Adhan alarm loudness and snooze preferences, shared by the web overlay and the phone alarm. */

const VOLUME_KEY = 'adhanVolume';
const SNOOZE_KEY = 'adhanSnoozeMinutes';

export const SNOOZE_CHOICES = [3, 5, 10] as const;

export const getAlarmVolume = (): number => {
  const raw = parseFloat(localStorage.getItem(VOLUME_KEY) || '0.8');
  return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0.8;
};

export const setAlarmVolume = (v: number) => {
  localStorage.setItem(VOLUME_KEY, String(Math.min(1, Math.max(0, v))));
};

export const getSnoozeMinutes = (): number => {
  const raw = parseInt(localStorage.getItem(SNOOZE_KEY) || '5', 10);
  return SNOOZE_CHOICES.includes(raw as (typeof SNOOZE_CHOICES)[number]) ? raw : 5;
};

export const setSnoozeMinutes = (m: number) => {
  localStorage.setItem(SNOOZE_KEY, String(m));
};
