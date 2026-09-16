import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { placeOrder, formatMoney } from '@/utils/shopApi';
import type { CartLine } from './ShopDetailsScreen';

interface Props {
  shopId: string;
  lines: CartLine[];
  deliveryAvailable: boolean;
  onBack: () => void;
  onDone: () => void;
}

export const ShopCheckoutScreen = ({ shopId, lines, deliveryAvailable, onBack, onDone }: Props) => {
  const { user, profile, isSignedIn, openAuth } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [fulfilment, setFulfilment] = useState<'pickup' | 'delivery'>(deliveryAvailable ? 'delivery' : 'pickup');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  const total = lines.reduce((s, l) => s + Number(l.product.price) * l.qty, 0);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('profiles')
      .select('display_name, phone')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.phone) setPhone((p) => p || (data.phone as string));
        if (data?.display_name) setName((n) => n || (data.display_name as string));
      });
  }, [user?.id]);

  const submit = async () => {
    if (!isSignedIn) {
      openAuth('Sign in to place your order');
      return;
    }
    if (!name.trim() || !phone.trim()) {
      toast({ title: 'Missing details', description: 'Name and mobile number are required.', variant: 'destructive' });
      return;
    }
    if (fulfilment === 'delivery' && !address.trim()) {
      toast({ title: 'Address needed', description: 'Please add a delivery address.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await placeOrder({
        shopId,
        contactName: name.trim(),
        contactPhone: phone.trim(),
        contactEmail: email.trim() || undefined,
        fulfilment,
        address: address.trim() || undefined,
        note: note.trim() || undefined,
        marketingConsent: consent,
        items: lines.map((l) => ({
          product_id: l.product.id,
          product_name: l.product.name,
          unit_price: Number(l.product.price),
          quantity: l.qty,
        })),
      });
      toast({ title: 'Order placed', description: 'The shop will confirm your order shortly.' });
      onDone();
    } catch (e: any) {
      toast({ title: 'Could not place order', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-500';

  return (
    <div className="min-h-screen pb-28">
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-4 pt-5 pb-5 text-white">
        <button onClick={onBack} className="flex items-center gap-1 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl font-bold">Place your order</h1>
        <p className="text-xs text-white/80 mt-1">Payment is settled with the shop on pickup or delivery.</p>
      </div>

      <div className="px-4 mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        {lines.map((l) => (
          <div key={l.product.id} className="flex justify-between text-sm py-1">
            <span className="text-gray-700">
              {l.product.name} × {l.qty}
            </span>
            <span className="font-semibold text-gray-800">{formatMoney(Number(l.product.price) * l.qty)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-gray-100 mt-2 pt-2 text-sm font-bold">
          <span>Total</span>
          <span className="text-emerald-700">{formatMoney(total)}</span>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" inputMode="tel" />
        <input className={field} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" inputMode="email" />

        <div className="flex gap-2">
          {(['pickup', 'delivery'] as const).map((f) => (
            <button
              key={f}
              disabled={f === 'delivery' && !deliveryAvailable}
              onClick={() => setFulfilment(f)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize disabled:opacity-40 ${
                fulfilment === f ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {fulfilment === 'delivery' && (
          <textarea className={field} rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address" />
        )}
        <textarea className={field} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the shop (optional)" />

        <label className="flex items-start gap-2 text-[11px] text-gray-600 bg-white rounded-xl p-3 border border-gray-100">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
          <span>
            Share my name, mobile and email with this shop and allow the app to contact me about offers.
          </span>
        </label>

        <button
          onClick={submit}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <CheckCircle2 className="w-4 h-4" /> {saving ? 'Placing order…' : 'Confirm order'}
        </button>
      </div>
    </div>
  );
};
