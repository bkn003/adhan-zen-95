/**
 * Client-side throttle for sign-in / sign-up / password-reset attempts.
 *
 * Supabase already rate-limits these endpoints server-side; this adds a visible
 * local cooldown so a stolen device or a script driving the form cannot hammer
 * the sheet, and so the user gets a clear "wait N seconds" message instead of an
 * opaque server error.
 */

const WINDOW_MS = 15 * 60 * 1000;
const LIMITS: Record<string, number> = { signin: 6, signup: 4, forgot: 3 };
const KEY = 'auth_attempts_v1';

type Store = Record<string, number[]>;

const read = (): Store => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Store;
  } catch {
    return {};
  }
};

const write = (s: Store) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
};

const recent = (action: string, store: Store) =>
  (store[action] ?? []).filter((t) => Date.now() - t < WINDOW_MS);

/** Seconds the user must wait, or 0 when the attempt may proceed. */
export function retryAfterSeconds(action: keyof typeof LIMITS | string): number {
  const store = read();
  const hits = recent(action, store);
  const limit = LIMITS[action] ?? 6;
  if (hits.length < limit) return 0;
  const oldest = Math.min(...hits);
  return Math.max(1, Math.ceil((WINDOW_MS - (Date.now() - oldest)) / 1000));
}

export function recordAttempt(action: string) {
  const store = read();
  store[action] = [...recent(action, store), Date.now()];
  write(store);
}

/** Called after a successful sign-in so genuine users are not left throttled. */
export function clearAttempts(action?: string) {
  if (!action) return write({});
  const store = read();
  delete store[action];
  write(store);
}

export const formatWait = (seconds: number) =>
  seconds >= 60 ? `${Math.ceil(seconds / 60)} minute(s)` : `${seconds} second(s)`;
