import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, EyeOff, Eye, Trash2, Flag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  locationId: string;
}

interface AdminReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  is_hidden: boolean;
  report_count: number;
}

export const ReviewsAdmin: React.FC<Props> = ({ locationId }) => {
  const qc = useQueryClient();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['admin-mosque-reviews', locationId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('mosque-admin', {
        body: { action: 'list_reviews', location_id: locationId },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      return ((data as any)?.reviews ?? []) as AdminReview[];
    },
  });

  const moderate = async (id: string, patch: { hidden?: boolean; remove?: boolean }) => {
    if (patch.remove && !confirm('Permanently delete this review?')) return;
    try {
      const { data, error } = await supabase.functions.invoke('mosque-admin', {
        body: {
          action: 'moderate_review',
          location_id: locationId,
          data: { id, ...patch },
        },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success(patch.remove ? 'Review deleted' : patch.hidden ? 'Review hidden' : 'Review restored');
      qc.invalidateQueries({ queryKey: ['admin-mosque-reviews', locationId] });
    } catch (e: any) {
      toast.error(e.message || 'Action failed');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div>;
  }

  const list = reviews ?? [];
  const reported = list.filter((r) => r.report_count > 0 && !r.is_hidden);

  return (
    <div className="space-y-3">
      {reported.length > 0 && (
        <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700 font-semibold flex items-center gap-1.5">
          <Flag className="w-3.5 h-3.5" /> {reported.length} reported review(s) need your attention
        </div>
      )}

      {list.length === 0 && <p className="text-center text-xs text-gray-400 py-4">No reviews yet</p>}

      {list.map((r) => (
        <div
          key={r.id}
          className={`rounded-xl border p-3 ${r.is_hidden ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-gray-100'}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                ))}
                {r.report_count > 0 && (
                  <span className="ml-1 text-[10px] font-bold text-rose-600 flex items-center gap-0.5">
                    <Flag className="w-3 h-3" /> {r.report_count}
                  </span>
                )}
                {r.is_hidden && <span className="ml-1 text-[10px] font-bold text-gray-500">HIDDEN</span>}
              </div>
              {r.comment && <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{r.comment}</p>}
              <p className="text-[10px] text-gray-400 mt-1">{new Date(r.created_at).toLocaleString()}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => moderate(r.id, { hidden: !r.is_hidden })}
                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"
                title={r.is_hidden ? 'Restore' : 'Hide'}
              >
                {r.is_hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => moderate(r.id, { remove: true })}
                className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
