import { useEffect, useState } from 'react';
import { ArrowLeft, ShieldCheck, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { applyForShop, uploadShopMedia, SHOP_CATEGORIES, type Shop } from '@/utils/shopApi';

interface Props {
  onBack: () => void;
  onApplied: () => void;
  existing?: Shop | null;
}

export const SellerApplyScreen = ({ onBack, onApplied, existing }: Props) => {
  const { user, isSignedIn, openAuth } = useAuth();
  const [mosques, setMosques] = useState<{ id: string; mosque_name: string; district: string }[]>([]);
  const [form, setForm] = useState({
    name: '',
    owner_name: '',
    phone: '',
    email: '',
    category: SHOP_CATEGORIES[0] as string,
    description: '',
    address: '',
    area: '',
    map_link: '',
    nearest_location_id: '',
    timings: '',
    delivery_available: true,
    pickup_available: true,
    min_order_amount: 0,
  });
  const [halal, setHalal] = useState(false);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('locations')
      .select('id, mosque_name, district')
      .order('mosque_name')
      .then(({ data }) => setMosques((data ?? []) as any));
  }, []);

  useEffect(() => {
    if (user?.email) setForm((f) => ({ ...f, email: f.email || user.email! }));
  }, [user?.email]);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const field = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-500 bg-white';

  const submit = async () => {
    if (!isSignedIn) {
      openAuth('Sign in to apply as a seller');
      return;
    }
    if (!form.name.trim() || !form.owner_name.trim() || !form.phone.trim()) {
      toast({ title: 'Missing details', description: 'Shop name, owner name and mobile number are required.', variant: 'destructive' });
      return;
    }
    if (!halal) {
      toast({ title: 'Halal declaration required', description: 'You must confirm you will sell halal products only.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let certPath: string | null = null;
      if (certificate && user?.id) {
        certPath = await uploadShopMedia(`applications/${user.id}`, certificate);
      }
      await applyForShop({
        ...form,
        email: form.email || null,
        description: form.description || null,
        address: form.address || null,
        area: form.area || null,
        map_link: form.map_link || null,
        timings: form.timings || null,
        nearest_location_id: form.nearest_location_id || null,
        min_order_amount: Number(form.min_order_amount) || 0,
        halal_declared: true,
        halal_certificate_path: certPath,
      });
      toast({ title: 'Application sent', description: 'We will review your shop and let you know.' });
      onApplied();
    } catch (e: any) {
      toast({ title: 'Could not submit', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (existing) {
    return (
      <div className="min-h-screen pb-24">
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-4 pt-5 pb-5 text-white">
          <button onClick={onBack} className="flex items-center gap-1 text-sm mb-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-xl font-bold">Your shop application</h1>
        </div>
        <div className="px-4 mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800">{existing.name}</h2>
          <p className="text-sm text-gray-600 mt-1 capitalize">Status: {existing.status}</p>
          {existing.rejection_reason && (
            <p className="text-xs text-red-600 mt-2">Reason: {existing.rejection_reason}</p>
          )}
          <p className="text-xs text-gray-500 mt-3">
            {existing.status === 'pending'
              ? 'Your application is waiting for review. You will be able to add products once it is approved.'
              : existing.status === 'approved'
                ? 'Your shop is live. Use "My shop" to add products and manage orders.'
                : 'Contact support if you would like this reviewed again.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28">
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-4 pt-5 pb-5 text-white">
        <button onClick={onBack} className="flex items-center gap-1 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl font-bold">Sell on the app</h1>
        <p className="text-xs text-white/80 mt-1">Halal-only shops near a mosque. Every application is reviewed.</p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <input className={field} placeholder="Shop name" value={form.name} onChange={(e) => set('name', e.target.value)} />
        <input className={field} placeholder="Owner name" value={form.owner_name} onChange={(e) => set('owner_name', e.target.value)} />
        <input className={field} placeholder="Mobile number" inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        <input className={field} placeholder="Email (optional)" inputMode="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        <select className={field} value={form.category} onChange={(e) => set('category', e.target.value)}>
          {SHOP_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <textarea className={field} rows={2} placeholder="What do you sell?" value={form.description} onChange={(e) => set('description', e.target.value)} />
        <textarea className={field} rows={2} placeholder="Shop address" value={form.address} onChange={(e) => set('address', e.target.value)} />
        <input className={field} placeholder="Area / locality" value={form.area} onChange={(e) => set('area', e.target.value)} />
        <select className={field} value={form.nearest_location_id} onChange={(e) => set('nearest_location_id', e.target.value)}>
          <option value="">Nearest mosque (optional)</option>
          {mosques.map((m) => (
            <option key={m.id} value={m.id}>
              {m.mosque_name} — {m.district}
            </option>
          ))}
        </select>
        <input className={field} placeholder="Google Maps link (optional)" value={form.map_link} onChange={(e) => set('map_link', e.target.value)} />
        <input className={field} placeholder="Opening hours e.g. 9 AM – 9 PM" value={form.timings} onChange={(e) => set('timings', e.target.value)} />

        <div className="flex gap-2">
          {(
            [
              ['delivery_available', 'Delivery'],
              ['pickup_available', 'Pickup'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => set(key, !(form as any)[key])}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold ${
                (form as any)[key] ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          className={field}
          type="number"
          min={0}
          placeholder="Minimum order amount (₹)"
          value={form.min_order_amount || ''}
          onChange={(e) => set('min_order_amount', e.target.value)}
        />

        <label className="flex items-center gap-2 text-xs text-gray-700 bg-white rounded-xl p-3 border border-gray-100 cursor-pointer">
          <Upload className="w-4 h-4 text-emerald-600" />
          <span className="flex-1">{certificate ? certificate.name : 'Halal certificate photo (optional)'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setCertificate(e.target.files?.[0] ?? null)} />
        </label>

        <label className="flex items-start gap-2 text-[11px] text-gray-700 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
          <input type="checkbox" checked={halal} onChange={(e) => setHalal(e.target.checked)} className="mt-0.5" />
          <span>
            <ShieldCheck className="w-3 h-3 inline mr-1 text-emerald-700" />
            I declare that this shop will list and sell halal products only. Breaking this ends my listing immediately.
          </span>
        </label>

        <button
          onClick={submit}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-60"
        >
          {saving ? 'Sending…' : 'Send application'}
        </button>
      </div>
    </div>
  );
};
