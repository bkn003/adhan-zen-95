/**
 * Shared field validation for shop forms, checkout and accounts.
 * Every rule returns a human sentence (or null when the value is fine), so the
 * same message can go straight into a toast or under an input.
 */

/** Indian mobile: exactly 10 digits starting 6-9. Spaces, dashes and +91 are tolerated. */
export const normalizeMobile = (raw: string): string => {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
};

export const isMobile = (raw: string) => /^[6-9]\d{9}$/.test(normalizeMobile(raw));

export const checkMobile = (raw: string, label = 'Mobile number'): string | null => {
  const v = normalizeMobile(raw);
  if (!v) return `${label} is required.`;
  if (v.length !== 10) return `${label} must be exactly 10 digits.`;
  if (!/^[6-9]/.test(v)) return `${label} must start with 6, 7, 8 or 9.`;
  return null;
};

export const checkOptionalMobile = (raw: string, label: string): string | null =>
  raw?.trim() ? checkMobile(raw, label) : null;

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test((v || '').trim());

export const checkOptionalEmail = (v: string): string | null =>
  !v?.trim() ? null : isEmail(v) ? null : 'That email address does not look right.';

export const checkText = (
  v: string,
  label: string,
  { min = 2, max = 120, required = true }: { min?: number; max?: number; required?: boolean } = {},
): string | null => {
  const t = (v || '').trim();
  if (!t) return required ? `${label} is required.` : null;
  if (t.length < min) return `${label} must be at least ${min} characters.`;
  if (t.length > max) return `${label} must be under ${max} characters.`;
  return null;
};

export const checkAmount = (
  v: unknown,
  label: string,
  { min = 0, max = 1000000, required = false }: { min?: number; max?: number; required?: boolean } = {},
): string | null => {
  if (v === '' || v === null || v === undefined) return required ? `${label} is required.` : null;
  const n = Number(v);
  if (!Number.isFinite(n)) return `${label} must be a number.`;
  if (n < min) return `${label} cannot be less than ${min}.`;
  if (n > max) return `${label} looks too large.`;
  return null;
};

export const checkInteger = (
  v: unknown,
  label: string,
  { min = 0, max = 100000 }: { min?: number; max?: number } = {},
): string | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isInteger(n)) return `${label} must be a whole number.`;
  if (n < min) return `${label} cannot be less than ${min}.`;
  if (n > max) return `${label} looks too large.`;
  return null;
};

/** Latitude / longitude, only when the shop typed something. */
export const checkLatitude = (v: string): string | null => {
  if (!v?.trim()) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < -90 || n > 90) return 'Latitude must be between -90 and 90.';
  return null;
};

export const checkLongitude = (v: string): string | null => {
  if (!v?.trim()) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < -180 || n > 180) return 'Longitude must be between -180 and 180.';
  return null;
};

export const checkLink = (v: string, label = 'Link'): string | null => {
  const t = (v || '').trim();
  if (!t) return null;
  if (!/^https?:\/\/\S+$/i.test(t)) return `${label} must start with http:// or https://`;
  if (t.length > 500) return `${label} is too long.`;
  return null;
};

export const checkPassword = (v: string): string | null => {
  if (!v) return 'Password is required.';
  if (v.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Password must include a letter and a number.';
  return null;
};

/** Runs rules in order and returns the first problem found. */
export const firstError = (...errors: (string | null)[]): string | null =>
  errors.find((e) => !!e) ?? null;
