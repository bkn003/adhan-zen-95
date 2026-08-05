import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True only for real accounts — anonymous sessions do not count. */
  isSignedIn: boolean;
  loading: boolean;
  /** Returns true when the user may proceed; otherwise opens the sign-in sheet. */
  requireAuth: (reason?: string) => boolean;
  openAuth: (reason?: string) => void;
  closeAuth: () => void;
  authPrompt: { open: boolean; reason?: string };
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authPrompt, setAuthPrompt] = useState<{ open: boolean; reason?: string }>({ open: false });

  const user = session?.user ?? null;
  const isSignedIn = !!user && !(user as User & { is_anonymous?: boolean }).is_anonymous;

  const loadProfile = useCallback(async (uid: string | null) => {
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', uid)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    // Register the listener first so no event is missed during boot.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
      const uid = next?.user && !(next.user as User & { is_anonymous?: boolean }).is_anonymous
        ? next.user.id
        : null;
      // Defer the profile read out of the callback (Supabase requirement).
      setTimeout(() => void loadProfile(uid), 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      const u = data.session?.user;
      const uid = u && !(u as User & { is_anonymous?: boolean }).is_anonymous ? u.id : null;
      void loadProfile(uid);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const openAuth = useCallback((reason?: string) => setAuthPrompt({ open: true, reason }), []);
  const closeAuth = useCallback(() => setAuthPrompt({ open: false }), []);

  const requireAuth = useCallback((reason?: string) => {
    if (isSignedIn) return true;
    setAuthPrompt({ open: true, reason });
    return false;
  }, [isSignedIn]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(isSignedIn ? user!.id : null);
  }, [isSignedIn, user, loadProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    session, user, profile, isSignedIn, loading,
    requireAuth, openAuth, closeAuth, authPrompt, signOut, refreshProfile,
  }), [session, user, profile, isSignedIn, loading, requireAuth, openAuth, closeAuth, authPrompt, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
