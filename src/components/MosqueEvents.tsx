import React, { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, MapPin, Check, HelpCircle, X, Users, Bell, ChevronDown, ChevronUp } from 'lucide-react';
import { getDeviceId } from '@/utils/deviceId';
import { toast } from 'sonner';

const CATEGORY_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  announcement: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '📢' },
  event: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '🕌' },
  lecture: { bg: 'bg-violet-100', text: 'text-violet-700', icon: '🎤' },
  fundraiser: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '🤲' },
  eid: { bg: 'bg-rose-100', text: 'text-rose-700', icon: '🌙' },
};

const RSVP_KEY = 'mosque_event_notify_ids';
const readNotifyIds = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RSVP_KEY) || '[]'); } catch { return []; }
};
const setNotifyIds = (ids: string[]) => localStorage.setItem(RSVP_KEY, JSON.stringify(ids));

const formatEventDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
};

interface MosqueEventsProps {
  locationId: string;
}

export const MosqueEvents: React.FC<MosqueEventsProps> = ({ locationId }) => {
  const deviceId = getDeviceId();
  const queryClient = useQueryClient();
  const [showPast, setShowPast] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ['mosque-events', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mosque_announcements')
        .select('*')
        .eq('location_id', locationId)
        .order('event_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: rsvps } = useQuery({
    queryKey: ['mosque-event-rsvps', locationId, deviceId],
    queryFn: async () => {
      const ids = (events ?? []).map((e: any) => e.id);
      if (ids.length === 0) return { my: {}, counts: {} };

      // Aggregate counts come from a security-definer RPC (no participant rows exposed)
      const [{ data: countRows }, { data: mine }] = await Promise.all([
        (supabase as any).rpc('get_event_rsvp_counts', { p_event_ids: ids }),
        supabase
          .from('mosque_event_rsvps')
          .select('event_id, status')
          .in('event_id', ids),
      ]);

      const counts: Record<string, { yes: number; maybe: number; no: number }> = {};
      (countRows ?? []).forEach((r: any) => {
        counts[r.event_id] ??= { yes: 0, maybe: 0, no: 0 };
        counts[r.event_id][r.status as 'yes' | 'maybe' | 'no'] = Number(r.count) || 0;
      });

      const my: Record<string, string> = {};
      (mine ?? []).forEach((r: any) => { my[r.event_id] = r.status; });

      return { my, counts };
    },
    enabled: !!events && events.length > 0,
  });


  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const list = events ?? [];
    const withDate = list.filter((e: any) => e.event_at);
    const noDate = list.filter((e: any) => !e.event_at);
    const upcoming = [
      ...noDate,
      ...withDate.filter((e: any) => new Date(e.event_at).getTime() >= now - 12 * 3600e3),
    ];
    const past = withDate.filter((e: any) => new Date(e.event_at).getTime() < now - 12 * 3600e3).reverse();
    return { upcoming, past };
  }, [events]);

  const rsvp = async (eventId: string, status: 'yes' | 'maybe' | 'no') => {
    const current = rsvps?.my?.[eventId];
    try {
      if (current === status) {
        await (supabase as any)
          .from('mosque_event_rsvps')
          .delete()
          .eq('event_id', eventId)
          .eq('device_id', deviceId);
      } else {
        await (supabase as any)
          .from('mosque_event_rsvps')
          .upsert({ event_id: eventId, device_id: deviceId, status }, { onConflict: 'event_id,device_id' });
      }
      queryClient.invalidateQueries({ queryKey: ['mosque-event-rsvps', locationId, deviceId] });
    } catch (e: any) {
      toast.error('Could not save RSVP');
    }
  };

  const toggleNotify = (event: any) => {
    const ids = new Set(readNotifyIds());
    if (ids.has(event.id)) {
      ids.delete(event.id);
      toast.success('Reminder removed');
    } else {
      ids.add(event.id);
      toast.success('You’ll be reminded 30 min before');
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
    setNotifyIds([...ids]);
    // trigger rerender
    queryClient.setQueryData(['notify-tick'], Date.now());
  };

  const notifySet = new Set(readNotifyIds());

  const renderEvent = (e: any) => {
    const cat = CATEGORY_STYLES[e.category] ?? CATEGORY_STYLES.announcement;
    const my = rsvps?.my?.[e.id];
    const counts = rsvps?.counts?.[e.id] ?? { yes: 0, maybe: 0, no: 0 };
    const isNotify = notifySet.has(e.id);
    return (
      <div key={e.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cat.bg} ${cat.text} mb-1`}>
              <span>{cat.icon}</span> {e.category}
            </div>
            <h4 className="text-sm font-bold text-gray-800 leading-snug">{e.title}</h4>
          </div>
          {e.event_at && (
            <button
              onClick={() => toggleNotify(e)}
              className={`p-2 rounded-xl shrink-0 ${isNotify ? 'bg-amber-100 text-amber-700' : 'bg-gray-50 text-gray-400'}`}
              aria-label="Toggle reminder"
            >
              <Bell className="w-4 h-4" />
            </button>
          )}
        </div>

        {e.body && <p className="text-xs text-gray-600 leading-relaxed mb-2 whitespace-pre-wrap">{e.body}</p>}

        <div className="flex flex-wrap gap-2 text-[11px] text-gray-500 mb-3">
          {e.event_at && (
            <span className="inline-flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
              <Calendar className="w-3 h-3" /> {formatEventDate(e.event_at)}
            </span>
          )}
          {e.end_at && (
            <span className="inline-flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
              <Clock className="w-3 h-3" /> Ends {formatEventDate(e.end_at)}
            </span>
          )}
          {e.location_note && (
            <span className="inline-flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
              <MapPin className="w-3 h-3" /> {e.location_note}
            </span>
          )}
        </div>

        {e.allow_rsvp && (
          <div>
            <div className="flex gap-1.5">
              <button
                onClick={() => rsvp(e.id, 'yes')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${my === 'yes' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700'}`}
              >
                <Check className="w-3.5 h-3.5" /> Going · {counts.yes}
              </button>
              <button
                onClick={() => rsvp(e.id, 'maybe')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${my === 'maybe' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700'}`}
              >
                <HelpCircle className="w-3.5 h-3.5" /> Maybe · {counts.maybe}
              </button>
              <button
                onClick={() => rsvp(e.id, 'no')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${my === 'no' ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-700'}`}
              >
                <X className="w-3.5 h-3.5" /> Can't · {counts.no}
              </button>
            </div>
            {(counts.yes + counts.maybe) > 0 && (
              <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-500">
                <Users className="w-3 h-3" /> {counts.yes + counts.maybe} people responding
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) return <div className="h-16 animate-pulse bg-gray-100 rounded-2xl" />;
  if (!events || events.length === 0) {
    return (
      <div className="text-center text-xs text-gray-400 py-6 bg-gray-50/50 rounded-2xl">
        No announcements or events yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {upcoming.map(renderEvent)}
      {past.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast(v => !v)}
            className="w-full flex items-center justify-center gap-1 py-2 text-xs text-gray-500 font-semibold"
          >
            {showPast ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showPast ? 'Hide' : 'Show'} past events ({past.length})
          </button>
          {showPast && <div className="space-y-3 opacity-70">{past.map(renderEvent)}</div>}
        </div>
      )}
    </div>
  );
};

// Notification scheduler (checks localStorage-scheduled events)
export function useEventReminders() {
  React.useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const ids = readNotifyIds();
      if (ids.length === 0) return;
      const { data } = await supabase
        .from('mosque_announcements')
        .select('id, title, event_at, location_id')
        .in('id', ids);
      if (cancelled || !data) return;
      const now = Date.now();
      const shown: string[] = JSON.parse(localStorage.getItem('mosque_event_shown') || '[]');
      const kept: string[] = [];
      data.forEach((e: any) => {
        if (!e.event_at) return;
        const eventTs = new Date(e.event_at).getTime();
        const diff = eventTs - now;
        if (diff <= 30 * 60 * 1000 && diff > -10 * 60 * 1000 && !shown.includes(e.id)) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Upcoming event', { body: e.title, tag: `mosque-event-${e.id}` });
          }
          kept.push(e.id);
        }
      });
      if (kept.length) {
        localStorage.setItem('mosque_event_shown', JSON.stringify([...shown, ...kept]));
      }
    };
    tick();
    const iv = setInterval(tick, 60_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);
}
