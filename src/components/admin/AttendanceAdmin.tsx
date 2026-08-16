import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, RefreshCw, Download, CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jummah'] as const;
const LABELS: Record<string, string> = {
  fajr: 'Fajr', dhuhr: 'Zuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', jummah: 'Jummah',
};

interface RosterRow {
  prayer: string;
  user_id: string;
  display_name: string;
  marked_at: string;
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const time12 = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

/**
 * Mosque-admin view of who marked "I'm attending" for each jamaat, with the
 * exact time (AM/PM) they marked it at the mosque.
 */
export const AttendanceAdmin: React.FC<{ locationId: string }> = ({ locationId }) => {
  const [date, setDate] = React.useState(() => dayKey(new Date()));

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['attendance-roster', locationId, date],
    enabled: !!locationId && !!date,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_mosque_attendance_roster', {
        p_location_id: locationId,
        p_date: date,
      });
      if (error) throw error;
      return (data ?? []) as RosterRow[];
    },
  });

  const grouped = React.useMemo(() => {
    const map: Record<string, RosterRow[]> = {};
    (data ?? []).forEach((r) => {
      map[r.prayer] = map[r.prayer] ?? [];
      map[r.prayer].push(r);
    });
    return map;
  }, [data]);

  const total = data?.length ?? 0;

  const exportCsv = () => {
    const rows = [['Prayer', 'Name', 'Marked at', 'Date']].concat(
      (data ?? []).map((r) => [LABELS[r.prayer] ?? r.prayer, r.display_name, time12(r.marked_at), date]),
    );
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `jamaat-attendance-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
          <CalendarDays className="w-3.5 h-3.5" />
          <input
            type="date"
            value={date}
            max={dayKey(new Date())}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
          />
        </label>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </button>
        <button
          onClick={exportCsv}
          disabled={!total}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 disabled:opacity-50"
        >
          <Download className="w-3 h-3" /> CSV
        </button>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
          <Users className="w-3.5 h-3.5" /> {total} marked
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-600">
          Could not load the attendance list. Only admins of this mosque can view it.
        </p>
      )}

      {isLoading ? (
        <p className="text-xs text-gray-400">Loading attendance…</p>
      ) : total === 0 ? (
        <p className="text-xs text-gray-500">No one marked attendance at this mosque on this day.</p>
      ) : (
        <div className="space-y-2">
          {PRAYERS.filter((p) => grouped[p]?.length).map((p) => (
            <div key={p} className="rounded-2xl border border-gray-100 bg-white p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-gray-800">{LABELS[p]}</p>
                <span className="text-[11px] font-semibold text-emerald-700">{grouped[p].length} attended</span>
              </div>
              <ul className="divide-y divide-gray-50">
                {grouped[p].map((r) => (
                  <li key={`${r.prayer}-${r.user_id}`} className="flex items-center justify-between py-1.5">
                    <span className="text-xs font-medium text-gray-700 truncate">{r.display_name}</span>
                    <span className="text-[11px] text-gray-500 tabular-nums shrink-0">{time12(r.marked_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-gray-400">
        Attendance is only markable within 300 m of the mosque, so this list reflects people who were present.
      </p>
    </div>
  );
};
