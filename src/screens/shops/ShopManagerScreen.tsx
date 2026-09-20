import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Package, ClipboardList, Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { shopVoiceUploadPath, VOICE_LANGS } from '@/utils/shopVoice';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  listShopProducts,
  saveProduct,
  deleteProduct,
  listShopOrders,
  setOrderStatus,
  updateMyShop,
  uploadShopMedia,
  getShopMediaUrls,
  formatMoney,
  ORDER_STATUSES,
  type Shop,
  type ShopProduct,
  type OrderStatus,
} from '@/utils/shopApi';

interface Props {
  shop: Shop;
  onBack: () => void;
}

const field = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-500 bg-white';

export const ShopManagerScreen = ({ shop, onBack }: Props) => {
  const [tab, setTab] = useState<'products' | 'orders' | 'shop'>('products');
  const qc = useQueryClient();

  const products = useQuery({ queryKey: ['manage-products', shop.id], queryFn: () => listShopProducts(shop.id) });
  const orders = useQuery({ queryKey: ['manage-orders', shop.id], queryFn: () => listShopOrders(shop.id) });
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const paths = (products.data ?? []).map((p) => p.photo_path).filter(Boolean) as string[];
    if (paths.length) getShopMediaUrls(paths).then(setPhotoUrls);
  }, [products.data]);

  const [draft, setDraft] = useState<Partial<ShopProduct>>({ name: '', price: 0, unit: '', is_available: true });
  const [file, setFile] = useState<File | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);

  const submitProduct = async () => {
    if (!draft.name?.trim()) {
      toast({ title: 'Product name required', variant: 'destructive' });
      return;
    }
    setSavingProduct(true);
    try {
      let photo_path = draft.photo_path ?? null;
      if (file) photo_path = await uploadShopMedia(shop.id, file);
      await saveProduct(shop.id, {
        ...draft,
        price: Number(draft.price) || 0,
        photo_path,
      } as Partial<ShopProduct>);
      setDraft({ name: '', price: 0, unit: '', is_available: true });
      setFile(null);
      qc.invalidateQueries({ queryKey: ['manage-products', shop.id] });
      toast({ title: 'Saved' });
    } catch (e: any) {
      toast({ title: 'Could not save', description: e.message, variant: 'destructive' });
    } finally {
      setSavingProduct(false);
    }
  };

  const toggleAvailability = async (p: ShopProduct) => {
    await saveProduct(shop.id, { id: p.id, is_available: !p.is_available });
    qc.invalidateQueries({ queryKey: ['manage-products', shop.id] });
  };

  const removeProduct = async (p: ShopProduct) => {
    await deleteProduct(p.id);
    qc.invalidateQueries({ queryKey: ['manage-products', shop.id] });
  };

  const changeStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await setOrderStatus(orderId, status);
      qc.invalidateQueries({ queryKey: ['manage-orders', shop.id] });
    } catch (e: any) {
      toast({ title: 'Could not update', description: e.message, variant: 'destructive' });
    }
  };

  const [shopForm, setShopForm] = useState({
    timings: shop.timings ?? '',
    address: shop.address ?? '',
    phone: shop.phone,
    delivery_available: shop.delivery_available,
    pickup_available: shop.pickup_available,
    min_order_amount: shop.min_order_amount,
    description: shop.description ?? '',
    upi_id: shop.upi_id ?? '',
    upi_payee_name: shop.upi_payee_name ?? shop.name,
    upi_enabled: shop.upi_enabled ?? false,
  });


  const [voiceLang, setVoiceLang] = useState('hi');
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [savingVoice, setSavingVoice] = useState(false);

  const uploadVoice = async () => {
    if (!voiceFile) return;
    setSavingVoice(true);
    try {
      const path = shopVoiceUploadPath(shop.id, voiceLang, voiceFile.name);
      const { error } = await supabase.storage
        .from('shop-media')
        .upload(path, voiceFile, { upsert: true, contentType: voiceFile.type || 'audio/mpeg' });
      if (error) throw error;
      setVoiceFile(null);
      toast({ title: 'Voice clip uploaded', description: 'Customers will hear it on your shop page.' });
    } catch (e: any) {
      toast({ title: 'Could not upload', description: e.message, variant: 'destructive' });
    } finally {
      setSavingVoice(false);
    }
  };

  const saveShop = async () => {
    try {
      await updateMyShop(shop.id, { ...shopForm, min_order_amount: Number(shopForm.min_order_amount) || 0 });
      toast({ title: 'Shop updated' });
    } catch (e: any) {
      toast({ title: 'Could not update', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen pb-28">
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-4 pt-5 pb-5 text-white">
        <button onClick={onBack} className="flex items-center gap-1 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl font-bold">{shop.name}</h1>
        <p className="text-xs text-white/80 mt-0.5 capitalize">Status: {shop.status}</p>
        <div className="flex gap-2 mt-3">
          {(
            [
              ['products', 'Products'],
              ['orders', 'Orders'],
              ['shop', 'Shop details'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold ${
                tab === id ? 'bg-white text-emerald-700' : 'bg-white/20 text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'products' && (
        <div className="px-4 mt-4 space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add a product
            </h2>
            <input className={field} placeholder="Product name" value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <textarea className={field} rows={2} placeholder="Description (optional)" value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <div className="flex gap-2">
              <input className={field} type="number" min={0} placeholder="Price ₹" value={draft.price || ''} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
              <input className={field} placeholder="Unit e.g. kg" value={draft.unit ?? ''} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 rounded-xl p-2 cursor-pointer">
              <Package className="w-4 h-4 text-emerald-600" />
              <span className="flex-1">{file ? file.name : 'Product photo (optional)'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <button
              onClick={submitProduct}
              disabled={savingProduct}
              className="w-full py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              {savingProduct ? 'Saving…' : 'Add product'}
            </button>
          </div>

          {(products.data ?? []).map((p) => (
            <div key={p.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-3 items-center">
              {p.photo_path && photoUrls[p.photo_path] ? (
                <img src={photoUrls[p.photo_path]} alt={p.name} loading="lazy" className="w-14 h-14 rounded-xl object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-emerald-50" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                <p className="text-xs text-gray-500">
                  {formatMoney(Number(p.price))}
                  {p.unit ? ` / ${p.unit}` : ''}
                </p>
                {p.is_hidden && <p className="text-[10px] text-red-600">Hidden after reports</p>}
              </div>
              <button
                onClick={() => toggleAvailability(p)}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${
                  p.is_available ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {p.is_available ? 'In stock' : 'Out of stock'}
              </button>
              <button onClick={() => removeProduct(p)} className="text-red-500 p-1" aria-label="Delete product">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'orders' && (
        <div className="px-4 mt-4 space-y-3">
          {orders.isLoading && <p className="text-sm text-gray-500 text-center">Loading…</p>}
          {!orders.isLoading && (orders.data ?? []).length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8 flex flex-col items-center gap-2">
              <ClipboardList className="w-6 h-6 text-gray-300" /> No orders yet.
            </p>
          )}
          {(orders.data ?? []).map((o) => (
            <div key={o.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{o.contact_name}</p>
                  <a href={`tel:${o.contact_phone}`} className="text-xs text-emerald-700 font-semibold">
                    {o.contact_phone}
                  </a>
                  <p className="text-[11px] text-gray-500">
                    {new Date(o.created_at).toLocaleString()} · {o.fulfilment}
                  </p>
                </div>
                <span className="text-sm font-bold text-emerald-700">{formatMoney(Number(o.total_amount))}</span>
              </div>
              {o.address && <p className="text-[11px] text-gray-600 mt-1">{o.address}</p>}
              {o.note && <p className="text-[11px] text-gray-500 mt-0.5">Note: {o.note}</p>}
              <div className="mt-2 space-y-0.5">
                {(o.shop_order_items ?? []).map((i, idx) => (
                  <div key={i.id ?? idx} className="flex justify-between text-xs text-gray-600">
                    <span>
                      {i.product_name} × {i.quantity}
                    </span>
                    <span>{formatMoney(Number(i.unit_price) * i.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 mt-2 overflow-x-auto">
                {ORDER_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeStatus(o.id, s)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold capitalize whitespace-nowrap ${
                      o.status === s ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'shop' && (
        <div className="px-4 mt-4 space-y-3">
          <input className={field} placeholder="Mobile number" value={shopForm.phone} onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })} />
          <textarea className={field} rows={2} placeholder="Address" value={shopForm.address} onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })} />
          <input className={field} placeholder="Opening hours" value={shopForm.timings} onChange={(e) => setShopForm({ ...shopForm, timings: e.target.value })} />
          <textarea className={field} rows={2} placeholder="Description" value={shopForm.description} onChange={(e) => setShopForm({ ...shopForm, description: e.target.value })} />
          <div className="flex gap-2">
            {(
              [
                ['delivery_available', 'Delivery'],
                ['pickup_available', 'Pickup'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setShopForm({ ...shopForm, [key]: !(shopForm as any)[key] })}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold ${
                  (shopForm as any)[key] ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-700'
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
            value={shopForm.min_order_amount || ''}
            onChange={(e) => setShopForm({ ...shopForm, min_order_amount: Number(e.target.value) })}
          />
          <button onClick={saveShop} className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> Save changes
          </button>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1">
              <Mic className="w-4 h-4 text-emerald-600" /> Your own voice introduction
            </h3>
            <p className="text-[11px] text-gray-500">
              Record a short clip in one language. Customers reading the app in that language hear your
              voice on the shop page; everyone else hears the listing read aloud automatically.
            </p>
            <select
              className={field}
              value={voiceLang}
              onChange={(e) => setVoiceLang(e.target.value)}
            >
              {VOICE_LANGS.map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 rounded-xl p-2 cursor-pointer">
              <Mic className="w-4 h-4 text-emerald-600" />
              <span className="flex-1">{voiceFile ? voiceFile.name : 'Choose an audio clip (mp3 / m4a)'}</span>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => setVoiceFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              onClick={uploadVoice}
              disabled={!voiceFile || savingVoice}
              className="w-full py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              {savingVoice ? 'Uploading…' : 'Upload voice clip'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
