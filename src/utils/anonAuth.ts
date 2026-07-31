import { supabase } from '@/integrations/supabase/client';

/**
 * The app has no signup/login for regular users, but row ownership must be
 * cryptographically verifiable (a client-supplied `x-device-id` header can be
 * spoofed by anyone). We therefore create a persistent Supabase *anonymous*
 * session so every write is owned by a real `auth.uid()` JWT claim.
 */
let inflight: Promise<string | null> | null = null;

export async function ensureAnonSession(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;

  if (!inflight) {
    inflight = supabase.auth
      .signInAnonymously()
      .then(({ data, error }) => {
        if (error) {
          console.warn('[auth] anonymous sign-in failed:', error.message);
          return null;
        }
        return data.user?.id ?? null;
      })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export async function getUserId(): Promise<string | null> {
  return ensureAnonSession();
}
