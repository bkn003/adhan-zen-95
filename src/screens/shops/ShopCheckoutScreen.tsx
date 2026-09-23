import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Copy, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { placeOrder, formatMoney, getShop, markOrderPaid, type Shop } from '@/utils/shopApi';
import { buildUpiUrl, buildUpiQrUrl, openUpiApp, upiQrSrc, isValidVpa } from '@/utils/upi';
import { checkMobile, checkOptionalEmail, checkText, firstError, normalizeMobile } from '@/utils/validation';
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
  const [shop, setShop] = useState<Shop | null>(null);
  const [payMethod, setPayMethod] = useState<'cash' | 'upi'>('cash');
  const [paidOrder, setPaidOrder] = useState<string | null>(null);

  useEffect(() => { getShop(shopId).then(setShop).catch(() => {}); }, [shopId]);
  const upiReady = !!shop?.upi_enabled && isValidVpa(shop?.upi_id ?? '');
  useEffect(() => { if (upiReady) setPayMethod('upi'); }, [upiReady]);

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
    const err = firstError(checkText(name, 'Name', { min: 2, max: 80 }), checkMobile(phone), checkOptionalEmail(email));
    if (err) {
      toast({ title: 'Check your details', description: err, variant: 'destructive' });
      return;
    }
    if (fulfilment === 'delivery' && !address.trim()) {
      toast({ title: 'Address needed', description: 'Please add a delivery address.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const orderId = await placeOrder({
        shopId,
        contactName: name.trim(),
        contactPhone: normalizeMobile(phone),
        paymentMethod: payMethod,
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
      if (payMethod === 'upi' && upiReady) {
        setPaidOrder(orderId);
        payNow();
      } else {
        toast({ title: 'Order placed', description: 'The shop will confirm your order shortly.' });
        onDone();
      }
    } catch (e: any) {
      toast({ title: 'Could not place order', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const upiParams = { pa: shop?.upi_id ?? '', pn: shop?.upi_payee_name || shop?.name || 'Shop', amount: total };
  const payNow = () => {
    const ok = openUpiApp(buildUpiUrl('upi', upiParams), () =>
      toast({ title: 'No UPI app opened', description: 'Scan the QR code or copy the UPI ID below.' }),
    );
    if (!ok) toast({ title: 'Scan to pay', description: 'Use the QR code below from any UPI app.' });
  };
  const confirmPaid = async () => {
    if (!paidOrder) return;
    try {
      await markOrderPaid(paidOrder);
      toast({ title: 'Payment noted', description: 'The shop will confirm once they receive it.' });
      onDone();
    } catch (e: any) {
      toast({ title: 'Could not update', description: e.message, variant: 'destructive' });
    }
  };

  if (paidOrder) {
    const qr = upiQrSrc(buildUpiQrUrl(upiParams));
    return (
      <div className="min-h-screen pb-28 px-4 pt-6 text-center">
        <h1 className="text-xl font-bold text-gray-800">Pay {formatMoney(total)}</h1>
        <p className="text-xs text-gray-500 mt-1">to {upiParams.pn}</p>
        <button onClick={payNow} className="mt-5 w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2">
          <Smartphone className="w-4 h-4" /> Pay with UPI app
        </button>
        {qr && <img src={qr} alt="UPI QR code" className="mx-auto mt-5 w-52 h-52 rounded-xl border border-gray-200 bg-white p-2" />}
        <button
          onClick={() => { navigator.clipboard?.writeText(upiParams.pa); toast({ title: 'UPI ID copied' }); }}
          className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold"
        >
          <Copy className="w-3 h-3" /> {upiParams.pa}
        </button>
        <button onClick={confirmPaid} className="mt-6 w-full py-3 rounded-xl border-2 border-emerald-600 text-emerald-700 text-sm font-bold">
          I have paid
        </button>
        <button onClick={onDone} className="mt-3 text-xs text-gray-500">Pay later on pickup / delivery</button>
      </div>
    );
  }

  const field = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-500';

  return (
    <div className="min-h-screen pb-28">
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-4 pt-5 pb-5 text-white">
        <button onClick={onBack} className="flex items-center gap-1 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl font-bold">Place your order</h1>
        <p className="text-xs text-white/80 mt-1">Pay by UPI now, or cash on pickup or delivery.</p>
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

        <div className="flex gap-2">
          {(['cash', 'upi'] as const).map((m) => (
            <button
              key={m}
              disabled={m === 'upi' && !upiReady}
              onClick={() => setPayMethod(m)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold disabled:opacity-40 ${
                payMethod === m ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-700'
              }`}
            >
              {m === 'cash' ? 'Cash on pickup/delivery' : 'Pay now by UPI'}
            </button>
          ))}
        </div>

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
