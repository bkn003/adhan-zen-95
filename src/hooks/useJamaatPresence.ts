import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Prayer } from '@/types/prayer.types';
import {
  checkAtMosque,
  formatDistance,
  watchProximity,
  ATTENDANCE_RADIUS_M,
  type Coords,
  type LiveProximity,
} from '@/utils/geofence';
import { toast } from 'sonner';

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Turns "HH:MM" (24h) into a Date for today. Returns null for empty values. */
export const timeToTodayDate = (time?: string | null): Date | null => {
  if (!time) return null;
  const m = time.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const d = new Date();
  d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
  return d;
};

export interface NextJamaat {
  prayer: Prayer;
  /** Jamaat (iqamah) time, falls back to adhan when iqamah is absent */
  at: Date;
  msLeft: number;
  isImminent: boolean;
}

/** Finds the upcoming jamaat (iqamah) and keeps a live countdown ticking. */
export const useNextJamaat = (prayers: Prayer[]): NextJamaat | null => {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    const isFriday = now.getDay() === 5;
    const candidates = prayers
      .filter((p) => ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jummah'].includes(p.type))
      .filter((p) => (isFriday ? p.type !== 'dhuhr' || !prayers.some((x) => x.type === 'jummah') : p.type !== 'jummah'))
      .map((p) => ({ p, at: timeToTodayDate(p.iqamah) || timeToTodayDate(p.adhan) }))
      .filter((c): c is { p: Prayer; at: Date } => !!c.at)
      .sort((a, b) => a.at.getTime() - b.at.getTime());

    const upcoming = candidates.find((c) => c.at.getTime() > now.getTime()) ?? candidates[0];
    if (!upcoming) return null;

    const msLeft = upcoming.at.getTime() - now.getTime();
    return {
      prayer: upcoming.p,
      at: upcoming.at,
      msLeft,
      isImminent: msLeft > 0 && msLeft <= 20 * 60 * 1000,
    };
  }, [prayers, now]);
};

export const formatCountdown = (ms: number): string => {
  if (ms <= 0) return 'Jamaat in progress';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(s).padStart(2, '0')}s`;
};

/** Live "I'm attending" presence for a mosque + prayer, for today. */
export const useAttendance = (
  locationId?: string,
  prayerKey?: string,
  /** Mosque coordinates — when given, attendance can only be marked nearby. */
  mosqueCoords?: Coords | null,
) => {
  const { user, isSignedIn, requireAuth } = useAuth();
  const queryClient = useQueryClient();
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [proximity, setProximity] = useState<LiveProximity>({ distance: null, inside: false, status: 'idle' });
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [locateAttempt, setLocateAttempt] = useState(0);
  const date = todayKey();

  // Live distance feedback so the user always knows why they can (or can't) mark attendance.
  const mosqueLat = mosqueCoords?.lat;
  const mosqueLng = mosqueCoords?.lng;
  useEffect(() => {
    if (mosqueLat == null || mosqueLng == null) {
      setProximity({ distance: null, inside: false, status: 'idle' });
      return;
    }
    return watchProximity({ lat: mosqueLat, lng: mosqueLng }, setProximity);
  }, [mosqueLat, mosqueLng, locateAttempt]);

  /** Re-asks the browser for a fix (used by the "Retry location" button). */
  const retryLocation = useCallback(async () => {
    setBlockedReason(null);
    setCheckingLocation(true);
    const here = await getCurrentCoords();
    setCheckingLocation(false);
    if (!here) {
      toast.error('Still cannot read your location — enable location for this app in your phone settings.');
    }
    setLocateAttempt((n) => n + 1);
  }, []);



  const countsQuery = useQuery({
    queryKey: ['attendance-counts', locationId, date],
    enabled: !!locationId && isSignedIn,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_attendance_counts', {
        p_location_id: locationId,
        p_date: date,
      });
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { map[r.prayer] = Number(r.count) || 0; });
      return map;
    },
  });

  const mineQuery = useQuery({
    queryKey: ['attendance-mine', locationId, date, user?.id],
    enabled: !!locationId && isSignedIn,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mosque_attendance')
        .select('prayer')
        .eq('location_id', locationId!)
        .eq('attend_date', date);
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.prayer as string));
    },
  });

  // Live updates when others mark attendance
  useEffect(() => {
    if (!locationId) return;
    const channel = supabase
      .channel(`attendance-${locationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mosque_attendance', filter: `location_id=eq.${locationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['attendance-counts', locationId, date] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [locationId, date, queryClient]);

  const isAttending = !!prayerKey && !!mineQuery.data?.has(prayerKey);
  const count = prayerKey ? countsQuery.data?.[prayerKey] ?? 0 : 0;

  const toggle = useCallback(async () => {
    if (!locationId || !prayerKey) return;
    if (!requireAuth('Sign in to mark your attendance')) return;
    const uid = user?.id;
    if (!uid) return;

    if (isAttending) {
      await supabase
        .from('mosque_attendance')
        .delete()
        .eq('location_id', locationId)
        .eq('prayer', prayerKey)
        .eq('attend_date', date)
        .eq('user_id', uid);
    } else {
      // Attendance may only be marked while physically at the mosque.
      if (mosqueCoords) {
        setCheckingLocation(true);
        const proximity = await checkAtMosque(mosqueCoords);
        setCheckingLocation(false);
        if (!proximity.ok) {
          setBlockedReason(
            proximity.reason === 'no-location'
              ? 'Location is off or blocked, so we cannot confirm you are at the mosque.'
              : `You are ${formatDistance(proximity.distance)} away — attendance opens within ${ATTENDANCE_RADIUS_M} m of the mosque.`,
          );
          toast.error(
            proximity.reason === 'no-location'
              ? 'Turn on location to mark attendance at the mosque.'
              : `You are ${formatDistance(proximity.distance)} away — come within ${ATTENDANCE_RADIUS_M} m of the mosque to mark attendance.`,
          );
          return;
        }
      }
      setBlockedReason(null);
      await supabase
        .from('mosque_attendance')
        .upsert(
          { location_id: locationId, prayer: prayerKey, attend_date: date, user_id: uid },
          { onConflict: 'location_id,user_id,prayer,attend_date' },
        );
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['attendance-counts', locationId, date] }),
      queryClient.invalidateQueries({ queryKey: ['attendance-mine', locationId, date, uid] }),
    ]);
  }, [locationId, prayerKey, isAttending, requireAuth, user?.id, date, queryClient, mosqueCoords]);

  return {
    counts: countsQuery.data ?? {},
    count,
    isAttending,
    toggle,
    checkingLocation,
    proximity,
    blockedReason,
    requiresPresence: !!mosqueCoords,
    isLoading: countsQuery.isLoading,
  };
};
