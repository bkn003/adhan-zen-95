import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, MapPin, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ATTENDANCE_RADIUS_M } from '@/utils/geofence';

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
const LABELS: Record<string, string> = {
  fajr: 'Fajr', dhuhr: 'Zuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
};

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const lastDays = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d;
  });

/**
 * Mosque attendance tracker: shows which jamaats the signed-in user actually
 * attended (marked at the mosque) and which were missed, for the last 7 days.
 */
export const AttendanceLog: React.FC = () => {
  const { isSignedIn, user, openAuth } = useAuth();
  const days = lastDays(7);
  const from = dayKey(days[days.length - 1]);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-log', user?.id, from],
    enabled: isSignedIn && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mosque_attendance')
        .select('prayer, attend_date, location_id')
        .gte('attend_date', from)
        .order('attend_date', { ascending: false });
      if (error) throw error;
      const map: Record<string, Set<string>> = {};
      (data ?? []).forEach((r: any) => {
        map[r.attend_date] = map[r.attend_date] ?? new Set();
        map[r.attend_date].add(r.prayer);
      });
      return map;
    },
  });

  if (!isSignedIn) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-center space-y-2">
        <Lock className="w-5 h-5 text-emerald-600 mx-auto" />
        <p className="text-sm font-semibold text-gray-800">Jamaat attendance tracker</p>
        <p className="text-xs text-gray-600">
          Sign in to log the jamaats you attend at your mosque and see your weekly record.
        </p>
        <button
          onClick={() => openAuth('Sign in to track your jamaat attendance')}
          className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
        >
          Sign in
        </button>
      </div>
    );
  }

  const attendedTotal = Object.values(data ?? {}).reduce((sum, s) => sum + s.size, 0);
  const possible = days.length * PRAYERS.length;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-gray-800">Jamaat attendance (7 days)</p>
          <p className="text-[11px] text-gray-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Marked only within {ATTENDANCE_RADIUS_M} m of the mosque
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-extrabold text-emerald-600 tabular-nums">
            {attendedTotal}/{possible}
          </p>
          <p className="text-[10px] text-gray-400">attended</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-gray-400">Loading your record…</p>
      ) : (
        <div className="space-y-1.5">
          <div className="grid grid-cols-6 gap-1 text-[10px] font-semibold text-gray-400">
            <span>Day</span>
            {PRAYERS.map((p) => (
              <span key={p} className="text-center">{LABELS[p]}</span>
            ))}
          </div>
          {days.map((d) => {
            const key = dayKey(d);
            const set = data?.[key];
            return (
              <div key={key} className="grid grid-cols-6 gap-1 items-center">
                <span className="text-[11px] font-medium text-gray-600">
                  {d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                </span>
                {PRAYERS.map((p) => (
                  <span key={p} className="flex justify-center">
                    {set?.has(p) ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-200" />
                    )}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[10px] text-gray-400">
        Attendance is recorded when you tap “I'm attending” on the mosque's Jamaat countdown while you are at the
        mosque. Missed entries stay private to you.
      </p>
    </div>
  );
};
