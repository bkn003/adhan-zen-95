import React, { useMemo, useState } from 'react';
import { ArrowLeft, Bell, BellOff, Rss, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MosqueTrustBadge } from '@/components/MosqueTrustBadge';
import { isAnnouncementVisible } from '@/utils/announcementWindow';
import { toast } from 'sonner';

interface FeedScreenProps {
  onBack: () => void;
}

const CATEGORY_META: Record<string, { icon: string; chip: string; label: string }> = {
  announcement: { icon: '📢', chip: 'bg-blue-100 text-blue-700', label: 'Announcement' },
  event: { icon: '🕌', chip: 'bg-emerald-100 text-emerald-700', label: 'Event' },
  lecture: { icon: '🎤', chip: 'bg-violet-100 text-violet-700', label: 'Lecture' },
  fundraiser: { icon: '🤲', chip: 'bg-amber-100 text-amber-700', label: 'Fundraiser' },
  eid: { icon: '🌙', chip: 'bg-rose-100 text-rose-700', label: 'Eid' },
  janazah: { icon: '🕊️', chip: 'bg-slate-200 text-slate-800', label: 'Janazah' },
  khutbah: { icon: '📖', chip: 'bg-teal-100 text-teal-700', label: 'Jummah Khutbah' },
};

const FILTERS = ['all', 'janazah', 'khutbah', 'announcement', 'event', 'lecture', 'fundraiser', 'eid'] as const;

const formatWhen = (iso?: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
};

export const FeedScreen: React.FC<FeedScreenProps> = ({ onBack }) => {
  const { isSignedIn, requireAuth, user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  const { data: follows, isLoading: followsLoading } = useQuery({
    queryKey: ['my-follows', user?.id],
    enabled: isSignedIn,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mosque_follows')
        .select('location_id, announcements');
      if (error) throw error;
      return data ?? [];
    },
  });

  const followedIds = useMemo(
    () => (follows ?? []).map((f: any) => f.location_id as string),
    [follows],
  );

  const { data: mosques } = useQuery({
    queryKey: ['feed-mosques', followedIds.join(',')],
    enabled: followedIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, mosque_name, district')
        .in('id', followedIds);
      if (error) throw error;
      const map: Record<string, { mosque_name: string; district: string }> = {};
      (data ?? []).forEach((l: any) => { map[l.id] = l; });
      return map;
    },
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['feed-posts', followedIds.join(',')],
    enabled: followedIds.length > 0,
    refetchInterval: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mosque_announcements')
        .select('*')
        .in('location_id', followedIds)
        .order('created_at', { ascending: false })
        .limit(80);
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleAlerts = async (locationId: string, current: boolean) => {
    if (!requireAuth('Sign in to manage mosque alerts')) return;
    const { error } = await supabase
      .from('mosque_follows')
      .update({ announcements: !current })
      .eq('location_id', locationId);
    if (error) { toast.error('Could not update alerts'); return; }
    toast.success(!current ? 'Alerts on' : 'Alerts muted');
    queryClient.invalidateQueries({ queryKey: ['my-follows', user?.id] });
  };

  const visible = (posts ?? []).filter((p: any) => {
    if (filter !== 'all' && (p.category || 'announcement') !== filter) return false;
    return isAnnouncementVisible(p); // respect admin display windows
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 pb-20">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-emerald-100 px-3 py-2 flex items-center gap-2">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-emerald-50">
          <ArrowLeft className="w-5 h-5 text-emerald-700" />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-800 flex items-center gap-1.5">
            <Rss className="w-4 h-4 text-emerald-600" /> Mosque Feed
          </h1>
          <p className="text-[10px] text-gray-500">Announcements, janazah notices & khutbah topics</p>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {!isSignedIn && (
          <div className="bg-white rounded-2xl border border-amber-200 p-4 text-center space-y-2">
            <p className="text-sm text-gray-700">Sign in to see posts from the mosques you follow.</p>
            <button
              onClick={() => requireAuth('Sign in to view your mosque feed')}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
            >
              Sign in
            </button>
          </div>
        )}

        {isSignedIn && (
          <>
            {/* Followed mosques + per-mosque alert toggle */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-3">
              <p className="text-xs font-bold text-gray-700 mb-2">Following ({followedIds.length})</p>
              {followsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : followedIds.length === 0 ? (
                <p className="text-[11px] text-gray-500">
                  You aren't following any mosque yet. Open a mosque page and tap “Follow” to get its notices here.
                </p>
              ) : (
                <div className="space-y-2">
                  {(follows ?? []).map((f: any) => (
                    <div key={f.location_id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {mosques?.[f.location_id]?.mosque_name || 'Mosque'}
                        </p>
                        <MosqueTrustBadge locationId={f.location_id} />
                      </div>
                      <button
                        onClick={() => toggleAlerts(f.location_id, !!f.announcements)}
                        className={`shrink-0 p-2 rounded-xl ${f.announcements ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                        aria-label={f.announcements ? 'Mute alerts' : 'Enable alerts'}
                      >
                        {f.announcements ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category filter */}
            {followedIds.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                      filter === f
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {f === 'all' ? 'All' : `${CATEGORY_META[f]?.icon ?? ''} ${CATEGORY_META[f]?.label ?? f}`}
                  </button>
                ))}
              </div>
            )}

            {/* Posts */}
            {postsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-white animate-pulse border border-gray-100" />)}
              </div>
            ) : visible.length === 0 ? (
              followedIds.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                  <p className="text-sm text-gray-500">No posts yet in this category.</p>
                </div>
              )
            ) : (
              <div className="space-y-2">
                {visible.map((p: any) => {
                  const meta = CATEGORY_META[p.category || 'announcement'] ?? CATEGORY_META.announcement;
                  const when = formatWhen(p.event_at);
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${meta.chip}`}>
                          {meta.icon} {meta.label}
                        </span>
                        <span className="text-[9px] text-gray-400">
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-800">{p.title}</p>
                      <p className="text-[11px] text-gray-600 whitespace-pre-line mt-0.5">{p.body}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <p className="text-[10px] text-emerald-700 font-semibold truncate">
                          {mosques?.[p.location_id]?.mosque_name || 'Mosque'}
                        </p>
                        {when && <p className="text-[10px] text-gray-500 shrink-0">🕒 {when}</p>}
                      </div>
                      {p.location_note && (
                        <p className="text-[10px] text-gray-500 mt-0.5">📍 {p.location_note}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
