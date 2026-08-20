import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = "https://lhufqnokmdqkvzcxqwkl.supabase.co";
export const ADMIN_FN_URL = `${SUPABASE_URL}/functions/v1/mosque-admin`;
export const PHOTOS_FN_URL = `${SUPABASE_URL}/functions/v1/mosque-photos`;

/** Attaches the signed-in Supabase session so the edge function can authorize the caller. */
export async function authHeaders(withJson = true): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (withJson) headers['Content-Type'] = 'application/json';
  if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  return headers;
}

/** POST an admin action, throwing a readable error on failure. */
export async function adminCall<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ADMIN_FN_URL, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || 'Request failed');
  return data as T;
}

export interface AdminScope {
  user_id: string;
  email: string;
  is_super_admin: boolean;
  location_ids: string[];
  location_id: string | null;
  /** location_id -> section keys the admin may manage (super admins bypass). */
  permissions?: Record<string, string[]>;
}

/** All manageable admin-panel sections, in display order. */
export const ADMIN_SECTIONS = [
  { key: 'mosque', label: 'Mosque Info' },
  { key: 'filters', label: 'Amenities & Filters' },
  { key: 'prayer', label: 'Prayer Times' },
  { key: 'photos', label: 'Photos' },
  { key: 'events', label: 'Events & Announcements' },
  { key: 'khutbah', label: 'Jummah Khutbah' },
  { key: 'reviews', label: 'Reviews & Moderation' },
  { key: 'donations', label: 'Donations' },
  { key: 'attendance', label: 'Jamaat Attendance' },
  { key: 'audit', label: 'Edit History & Rollback' },
] as const;

export type AdminSectionKey = (typeof ADMIN_SECTIONS)[number]['key'];

/** True when the scope allows managing a section for a location. */
export function canManageSection(
  scope: Pick<AdminScope, 'is_super_admin' | 'permissions'> | null,
  locationId: string | null,
  section: AdminSectionKey,
): boolean {
  if (!scope) return false;
  if (scope.is_super_admin) return true;
  if (!locationId) return false;
  const perms = scope.permissions?.[locationId];
  // No permissions row yet (legacy admin) => full access, matches DB default.
  if (!perms) return true;
  return perms.includes(section);
}

/** Reads the caller's admin scope (super admin flag + managed mosques). */
export async function fetchAdminScope(): Promise<AdminScope | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  try {
    return await adminCall<AdminScope>('admin_whoami');
  } catch {
    return null;
  }
}

/** Anonymous sessions block credential sign-in, so drop them first. */
async function clearAnonSession() {
  const { data } = await supabase.auth.getUser();
  if (data?.user && (data.user as { is_anonymous?: boolean }).is_anonymous) {
    await supabase.auth.signOut();
  }
}

export async function adminSignIn(email: string, password: string) {
  await clearAnonSession();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

export async function adminSignUp(email: string, password: string) {
  await clearAnonSession();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
  return { needsConfirmation: !data.session };
}

export async function adminSignOut() {
  await supabase.auth.signOut();
}
