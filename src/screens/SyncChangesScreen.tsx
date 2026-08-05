import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, CalendarClock, CheckCircle2, History, Bell } from 'lucide-react';
import { getSyncState, subscribeSyncState, runPrayerSync, formatRelative, type SyncState } from '@/native/syncEngine';
import { supabase } from '@/integrations/supabase/client';
import { formatTo12Hour } from '@/utils/timeFormat';

interface Props {
  onBack: () => void;
}

interface ServerChange {
  id: string;
  location_id: string;
  month: string;
  date_range: string;
  label: string;
  old_value: string | null;
  new_value: string | null;
  detected_at: string;
}

const prettyDate = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};

/** Weekly change history recorded server-side for my mosque + my mohalla. */
const useServerChanges = () => {
  const [rows, setRows] = useState<ServerChange[]>([]);

  useEffect(() => {
    const ids = [
      localStorage.getItem('selectedLocationId'),
      localStorage.getItem('myMohallaId'),
    ].filter(Boolean) as string[];
    if (!ids.length) return;

    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
      const { data } = await supabase
        .from('prayer_time_changes')
        .select('id, location_id, month, date_range, label, old_value, new_value, detected_at')
        .in('location_id', [...new Set(ids)])
        .gte('detected_at', since)
        .order('detected_at', { ascending: false })
        .limit(120);
      if (!cancelled) setRows((data as ServerChange[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  return rows;
};

export const SyncChangesScreen: React.FC<Props> = ({ onBack }) => {
  const [state, setState] = useState<SyncState>(() => getSyncState());
  useEffect(() => subscribeSyncState(setState), []);
  const serverChanges = useServerChanges();

  const serverGrouped = serverChanges.reduce<Record<string, ServerChange[]>>((acc, c) => {
    const k = `${c.date_range} ${c.month}`;
    (acc[k] ||= []).push(c);
    return acc;
  }, {});

  const grouped = state.changes.reduce<Record<string, SyncState['changes']>>((acc, c) => {
    (acc[c.date] ||= []).push(c);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort();


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl active:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold text-gray-900 truncate">Recent time changes</h1>
          <p className="text-[11px] text-gray-500 truncate">
            {state.mosqueName || 'No mosque'} · synced {formatRelative(state.lastSyncAt)}
          </p>
        </div>
        <button
          onClick={() => void runPrayerSync()}
          disabled={state.status === 'syncing'}
          className="p-2 rounded-xl bg-sky-50 text-sky-600 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${state.status === 'syncing' ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {dates.length === 0 && Object.keys(serverGrouped).length === 0 && (
          <div className="text-center py-16">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-800">No changes detected</p>
            <p className="text-xs text-gray-500 mt-1 px-8">
              The last sync found the same timings for the coming days. You'll be notified here whenever your mosque updates a time.
            </p>
          </div>
        )}

        {/* Weekly schedule changes recorded on the server (also pushed as alerts) */}
        {Object.keys(serverGrouped).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <History className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-gray-800">Weekly schedule changes</h2>
              <span className="ml-auto text-[10px] text-gray-500 flex items-center gap-1">
                <Bell className="w-3 h-3" /> alerts sent
              </span>
            </div>
            {Object.entries(serverGrouped).map(([range, list]) => (
              <div key={range} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-white border-b border-gray-100">
                  <CalendarClock className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-bold text-gray-800">{range}</span>
                  <span className="ml-auto text-[11px] text-gray-500">{list.length} change(s)</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {list.map((c) => (
                    <div key={c.id} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-gray-700 truncate mr-2">{c.label}</span>
                      <span className="shrink-0 flex items-center gap-2 text-sm font-semibold">
                        <span className="text-gray-400 line-through">{formatTo12Hour(c.old_value || '')}</span>
                        <span className="text-gray-300">→</span>
                        <span className="text-emerald-600">{formatTo12Hour(c.new_value || '')}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}


        {dates.map((date) => (
          <div key={date} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-50 to-white border-b border-gray-100">
              <CalendarClock className="w-4 h-4 text-sky-600" />
              <span className="text-sm font-bold text-gray-800">{prettyDate(date)}</span>
              <span className="ml-auto text-[11px] text-gray-500">{grouped[date].length} change(s)</span>
            </div>
            <div className="divide-y divide-gray-50">
              {grouped[date].map((c, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-700 truncate mr-2">{c.label}</span>
                  <span className="shrink-0 flex items-center gap-2 text-sm font-semibold">
                    <span className="text-gray-400 line-through">{c.from}</span>
                    <span className="text-gray-300">→</span>
                    <span className="text-emerald-600">{c.to}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
