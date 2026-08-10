import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Freshness {
  locationId: string;
  lastUpdated: Date | null;
  verified: boolean;
  /** 0-100 SLA freshness score */
  score: number;
  label: 'Excellent' | 'Good' | 'Stale' | 'Unknown';
  daysAgo: number | null;
}

const scoreFor = (lastUpdated: Date | null, verified: boolean): Pick<Freshness, 'score' | 'label' | 'daysAgo'> => {
  if (!lastUpdated || lastUpdated.getFullYear() < 1980) {
    return { score: verified ? 40 : 20, label: 'Unknown', daysAgo: null };
  }
  const daysAgo = Math.max(0, Math.floor((Date.now() - lastUpdated.getTime()) / 86_400_000));
  // Weekly ranges change ~5x/month, so <=7 days is excellent, <=30 good.
  let score = daysAgo <= 7 ? 100 : daysAgo <= 30 ? 80 : daysAgo <= 90 ? 55 : 30;
  if (verified) score = Math.min(100, score + 10); else score = Math.max(0, score - 15);
  const label: Freshness['label'] = score >= 85 ? 'Excellent' : score >= 60 ? 'Good' : 'Stale';
  return { score, label, daysAgo };
};

/** Timing freshness / admin SLA + verified status for one or more mosques. */
export const useMosqueFreshness = (locationIds: string[]) => {
  const ids = [...new Set(locationIds.filter(Boolean))].sort();
  return useQuery({
    queryKey: ['mosque-freshness', ids.join(',')],
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_mosque_freshness', { p_location_ids: ids });
      if (error) throw error;
      const map: Record<string, Freshness> = {};
      (data ?? []).forEach((r: any) => {
        const lastUpdated = r.last_updated ? new Date(r.last_updated) : null;
        const verified = !!r.verified;
        map[r.location_id] = {
          locationId: r.location_id,
          lastUpdated,
          verified,
          ...scoreFor(lastUpdated, verified),
        };
      });
      return map;
    },
  });
};
