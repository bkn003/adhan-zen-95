import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Megaphone, X, ChevronRight, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { isAnnouncementPopupActive } from '@/utils/announcementWindow';

interface PopupAnnouncement {
  id: string;
  title: string;
  body: string | null;
  category: string;
  visible_from: string | null;
  visible_until: string | null;
  created_at: string;
  updated_at: string;
}

const DISMISS_KEY = 'announcementPopupDismissed';

const readDismissed = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}');
  } catch {
    return {};
  }
};

const CATEGORY_META: Record<string, { icon: string; chip: string }> = {
  announcement: { icon: '📢', chip: 'bg-blue-100 text-blue-700' },
  event: { icon: '🕌', chip: 'bg-emerald-100 text-emerald-700' },
  lecture: { icon: '🎤', chip: 'bg-violet-100 text-violet-700' },
  fundraiser: { icon: '🤲', chip: 'bg-amber-100 text-amber-700' },
  eid: { icon: '🌙', chip: 'bg-rose-100 text-rose-700' },
  janazah: { icon: '🕊️', chip: 'bg-slate-200 text-slate-700' },
  khutbah: { icon: '📖', chip: 'bg-teal-100 text-teal-700' },
};

/**
 * Home-page popup for the selected mosque's announcements.
 *
 * Shows announcements whose display window (visible_from → visible_until)
 * includes right now; announcements without a window pop up for 2 days after
 * publishing. Long bodies scroll inside the card. Dismissing remembers the
 * announcement's updated_at, so an edited announcement pops up again.
 */
export const AnnouncementPopup: React.FC<{ locationId?: string | null }> = ({ locationId }) => {
  const [dismissed, setDismissed] = useState<Record<string, string>>(readDismissed);

  const { data } = useQuery({
    queryKey: ['announcement-popup', locationId],
    enabled: !!locationId,
    refetchInterval: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mosque_announcements')
        .select('id, title, body, category, visible_from, visible_until, created_at, updated_at')
        .eq('location_id', locationId!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as PopupAnnouncement[];
    },
  });

  const queue = useMemo(
    () =>
      (data ?? []).filter(
        (a) => isAnnouncementPopupActive(a) && dismissed[a.id] !== a.updated_at,
      ),
    [data, dismissed],
  );

  const current = queue[0];

  const dismiss = () => {
    if (!current) return;
    const next = { ...readDismissed(), [current.id]: current.updated_at };
    // Keep the map small — only remember the 50 most recent dismissals.
    const ids = Object.keys(next);
    if (ids.length > 50) {
      ids.slice(0, ids.length - 50).forEach((id) => delete next[id]);
    }
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    setDismissed(next);
  };

  if (!current) return null;

  const meta = CATEGORY_META[current.category] ?? CATEGORY_META.announcement;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-white shrink-0" />
          <p className="flex-1 text-xs font-bold text-white uppercase tracking-wider">
            Mosque announcement
          </p>
          {queue.length > 1 && (
            <span className="text-[10px] font-bold text-emerald-100 bg-white/20 px-2 py-0.5 rounded-full">
              1 of {queue.length}
            </span>
          )}
          <button
            onClick={dismiss}
            className="p-1.5 -mr-1 rounded-full bg-white/20 text-white active:bg-white/30"
            aria-label="Close announcement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.chip}`}>
            <span>{meta.icon}</span> {current.category}
          </span>
          <h3 className="mt-2 text-base font-bold text-gray-900 leading-snug">{current.title}</h3>

          {/* Long text scrolls inside the card instead of overflowing */}
          {current.body && (
            <div className="mt-2 max-h-[40vh] overflow-y-auto pr-1 -mr-1">
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{current.body}</p>
            </div>
          )}

          {current.visible_until && (
            <p className="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
              <CalendarClock className="w-3 h-3" />
              Shown until{' '}
              {new Date(current.visible_until).toLocaleString(undefined, {
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          )}

          <button
            onClick={dismiss}
            className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold flex items-center justify-center gap-1 active:scale-[0.99]"
          >
            {queue.length > 1 ? (
              <>
                Next <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              'Got it'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
