// Shop reviews, order timeline and live new-order alerts for shop owners.
import { useEffect, useState } from 'react';
import { Star, Check } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const db = supabase as any;

export interface ShopReview {
  id: string;
  shop_id: string;
  user_id: string;
  reviewer_name: string | null;
  rating: number;
  comment: string | null;
  verified_buyer: boolean;
  created_at: string;
}

export const listShopReviews = async (shopId: string): Promise<ShopReview[]> => {
  const { data, error } = await db.from('shop_reviews').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
};

export const averageRating = (r: ShopReview[]) => (r.length ? r.reduce((s, x) => s + x.rating, 0) / r.length : 0);

const Stars = ({ value, onPick, size = 'w-4 h-4' }: { value: number; onPick?: (n: number) => void; size?: string }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" disabled={!onPick} onClick={() => onPick?.(n)} aria-label={`${n} star`}>
        <Star className={`${size} ${n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      </button>
    ))}
  </div>
);

export const RatingBadge = ({ shopId }: { shopId: string }) => {
  const q = useQuery({ queryKey: ['shop-reviews', shopId], queryFn: () => listShopReviews(shopId) });
  const r = q.data ?? [];
  if (!r.length) return <span className="text-xs opacity-80">No reviews yet</span>;
  return (
    <span className="text-xs font-semibold flex items-center gap-1">
      <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" /> {averageRating(r).toFixed(1)} · {r.length} review{r.length > 1 ? 's' : ''}
    </span>
  );
};

export const ShopReviews = ({ shopId, isOwner = false }: { shopId: string; isOwner?: boolean }) => {
  const { user, profile, isSignedIn, openAuth } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['shop-reviews', shopId], queryFn: () => listShopReviews(shopId) });
  const reviews = q.data ?? [];
  const mine = reviews.find((r) => r.user_id === user?.id);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mine) { setRating(mine.rating); setComment(mine.comment ?? ''); }
  }, [mine?.id]);

  const save = async () => {
    if (!isSignedIn || !user) return openAuth('Sign in to review this shop');
    if (rating < 1) return toast({ title: 'Pick a star rating', variant: 'destructive' });
    if (comment.length > 1000) return toast({ title: 'Comment is too long', description: 'Keep it under 1000 characters.', variant: 'destructive' });
    setSaving(true);
    const { error } = await db.from('shop_reviews').upsert(
      { shop_id: shopId, user_id: user.id, rating, comment: comment.trim() || null, reviewer_name: profile?.display_name ?? null },
      { onConflict: 'shop_id,user_id' },
    );
    setSaving(false);
    if (error) return toast({ title: 'Could not save review', description: error.message, variant: 'destructive' });
    toast({ title: 'Thanks for your review' });
    qc.invalidateQueries({ queryKey: ['shop-reviews', shopId] });
  };

  const avg = averageRating(reviews);
  const dist = [5, 4, 3, 2, 1].map((n) => reviews.filter((r) => r.rating === n).length);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-800">{reviews.length ? avg.toFixed(1) : '–'}</div>
          <Stars value={avg} />
          <div className="text-[11px] text-gray-500 mt-0.5">{reviews.length} reviews</div>
        </div>
        <div className="flex-1 space-y-1">
          {dist.map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-gray-500">
              <span className="w-3">{5 - i}</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${reviews.length ? (c / reviews.length) * 100 : 0}%` }} />
              </div>
              <span className="w-5 text-right">{c}</span>
            </div>
          ))}
        </div>
      </div>

      {!isOwner && (
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <p className="text-sm font-semibold text-gray-700">{mine ? 'Your review' : 'Rate this shop'}</p>
          <Stars value={rating} onPick={setRating} size="w-7 h-7" />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="How was the shop? (optional)"
            className="w-full rounded-xl border border-gray-200 p-2 text-sm"
          />
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : mine ? 'Update review' : 'Post review'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {reviews.map((r) => (
          <div key={r.id} className="border-t border-gray-100 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">{r.reviewer_name || 'Customer'}</span>
              <Stars value={r.rating} size="w-3 h-3" />
            </div>
            {r.verified_buyer && <span className="text-[10px] text-emerald-700 font-semibold">✓ Verified buyer</span>}
            {r.comment && <p className="text-xs text-gray-600 mt-0.5">{r.comment}</p>}
            <p className="text-[10px] text-gray-400">{new Date(r.created_at).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const STEPS = [
  { key: 'placed', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'ready', label: 'Ready / Out for delivery' },
  { key: 'completed', label: 'Delivered' },
];

export const OrderTimeline = ({ orderId, status }: { orderId: string; status: string }) => {
  const ev = useQuery({
    queryKey: ['order-events', orderId, status],
    queryFn: async () => {
      const { data } = await db.from('shop_order_events').select('*').eq('order_id', orderId).order('created_at');
      return (data ?? []) as { status: string; note: string | null; created_at: string }[];
    },
  });
  const events = ev.data ?? [];
  if (status === 'cancelled') {
    return <p className="mt-2 text-xs font-semibold text-red-600">Order cancelled</p>;
  }
  const reached = STEPS.findIndex((s) => s.key === status);
  return (
    <div className="mt-3 flex items-start">
      {STEPS.map((s, i) => {
        const done = i <= reached;
        const at = events.find((e) => e.status === s.key)?.created_at;
        return (
          <div key={s.key} className="flex-1 flex flex-col items-center text-center relative">
            {i > 0 && <div className={`absolute top-2.5 right-1/2 w-full h-0.5 ${i <= reached ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
            <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center ${done ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`}>
              {done && <Check className="w-3 h-3" />}
            </div>
            <span className={`text-[9px] mt-1 leading-tight ${done ? 'text-emerald-700 font-semibold' : 'text-gray-400'}`}>{s.label}</span>
            {at && <span className="text-[8px] text-gray-400">{new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
        );
      })}
    </div>
  );
};

/** Live updates: toast + refresh when an order for this shop arrives or changes. */
export const useOrderAlerts = (filter: { shopId?: string; userId?: string }, queryKey: unknown[]) => {
  const qc = useQueryClient();
  const col = filter.shopId ? 'shop_id' : 'user_id';
  const val = filter.shopId ?? filter.userId;
  useEffect(() => {
    if (!val) return;
    const ch = supabase
      .channel(`orders-${col}-${val}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shop_orders', filter: `${col}=eq.${val}` }, (p: any) => {
        qc.invalidateQueries({ queryKey });
        if (filter.shopId && p.eventType === 'INSERT') {
          toast({ title: 'New order received', description: `${p.new.contact_name} · ₹${p.new.total_amount}` });
          try { navigator.vibrate?.(300); } catch { /* ignore */ }
        } else if (filter.shopId && p.new?.payment_status === 'marked_paid' && p.old?.payment_status !== 'marked_paid') {
          toast({ title: 'Customer says they paid', description: 'Check your UPI app and confirm.' });
        } else if (filter.userId && p.eventType === 'UPDATE') {
          toast({ title: 'Order update', description: `Your order is now ${p.new.status}.` });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [col, val]);
};
