import React, { useEffect, useState } from 'react';
import { Star, Flag, Send, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const Stars: React.FC<{ value: number; onChange?: (n: number) => void; size?: string }> = ({
  value,
  onChange,
  size = 'w-4 h-4',
}) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        disabled={!onChange}
        onClick={() => onChange?.(n)}
        className={onChange ? 'active:scale-90 transition' : 'cursor-default'}
        aria-label={`${n} star`}
      >
        <Star className={`${size} ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      </button>
    ))}
  </div>
);

export const MosqueReviews: React.FC<{ locationId: string }> = ({ locationId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reported, setReported] = useState<string[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from('mosque_reviews')
      .select('id, rating, comment, created_at')
      .eq('location_id', locationId)
      .order('created_at', { ascending: false })
      .limit(30);
    setReviews((data ?? []) as Review[]);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  const submit = async () => {
    // Trust: only real (non-anonymous) accounts may publish a review.
    if (!requireAuth('Sign in to publish a review — verified accounts keep ratings trustworthy.')) return;
    if (!rating) return toast.error('Pick a star rating first');
    setSubmitting(true);

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) {
      setSubmitting(false);
      return toast.error('Session not ready — try again in a moment');
    }
    const { error } = await supabase.from('mosque_reviews').insert({
      location_id: locationId,
      user_id: userId,
      device_id: localStorage.getItem('adhan_zen_device_id') || 'web',
      rating,
      comment: comment.trim() || null,
    } as never);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success('Thanks for your review');
    setRating(0);
    setComment('');
    load();
  };

  const report = async (id: string) => {
    const { error } = await (supabase as any).rpc('report_mosque_review', {
      p_review_id: id,
      p_reason: 'inappropriate',
    });
    if (error) return toast.error('Could not report — try again');
    setReported((p) => [...p, id]);
    toast.success('Reported. Our moderators will review it.');
    load();
  };

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-white border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-amber-500" /> Reviews
        </h3>
        {avg && (
          <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
            {avg} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> ({reviews.length})
          </span>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* Write */}
        <div className="rounded-xl bg-gray-50 p-3 space-y-2">
          <Stars value={rating} onChange={setRating} size="w-5 h-5" />
          <textarea
            value={comment}
            maxLength={500}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share something helpful about this mosque…"
            className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-amber-400 resize-none"
            rows={2}
          />
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.99] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Post review
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div>
        ) : reviews.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">No reviews yet — be the first.</p>
        ) : (
          <div className="space-y-2">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <Stars value={r.rating} />
                  <button
                    onClick={() => report(r.id)}
                    disabled={reported.includes(r.id)}
                    className="text-[10px] text-gray-400 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Flag className="w-3 h-3" /> {reported.includes(r.id) ? 'Reported' : 'Report'}
                  </button>
                </div>
                {r.comment && <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{r.comment}</p>}
                <p className="text-[10px] text-gray-400 mt-1">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-gray-400 text-center">
          Reviews are anonymous. Reported reviews are hidden after review by mosque admins.
        </p>
      </div>
    </div>
  );
};
