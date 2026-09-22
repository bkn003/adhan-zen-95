import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Package, ClipboardList, Mic, Pencil, MapPin, IndianRupee, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { shopVoiceUploadPath, VOICE_LANGS } from '@/utils/shopVoice';
import { isValidVpa } from '@/utils/upi';
import { compressImage, kb } from '@/utils/imageCompress';
import { checkMobile, checkOptionalMobile, checkAmount, checkInteger, checkLatitude, checkLongitude, checkLink, checkText, firstError } from '@/utils/validation';
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

  const resetDraft = () =>
    setDraft({ name: '', price: 0, unit: '', is_available: true, mrp: null, stock_qty: 0, track_stock: false });

  const submitProduct = async () => {
    const problem = firstError(
      checkText(draft.name ?? '', 'Product name', { min: 2, max: 80 }),
      checkAmount(draft.price ?? 0, 'Price', { min: 1, required: true }),
      draft.mrp ? checkAmount(draft.mrp, 'MRP') : null,
      draft.track_stock ? checkInteger(draft.stock_qty ?? 0, 'Stock quantity') : null,
      draft.mrp && Number(draft.mrp) < Number(draft.price)
        ? 'MRP cannot be lower than your selling price.'
        : null,
    );
    if (problem) {
      toast({ title: problem, variant: 'destructive' });
      return;
    }
    setSavingProduct(true);
    try {
      let photo_path = draft.photo_path ?? null;
      if (file) {
        const small = await compressImage(file, { maxKb: 40, maxEdge: 900 });
        photo_path = await uploadShopMedia(shop.id, small);
      }
      await saveProduct(shop.id, {
        ...draft,
        price: Number(draft.price) || 0,
        mrp: draft.mrp ? Number(draft.mrp) : null,
        stock_qty: Number(draft.stock_qty) || 0,
        photo_path,
      } as Partial<ShopProduct>);
      resetDraft();
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
    whatsapp: shop.whatsapp ?? '',
    area: shop.area ?? '',
    latitude: shop.latitude != null ? String(shop.latitude) : '',
    longitude: shop.longitude != null ? String(shop.longitude) : '',
    map_link: shop.map_link ?? '',
    delivery_available: shop.delivery_available,
    pickup_available: shop.pickup_available,
    min_order_amount: shop.min_order_amount,
    description: shop.description ?? '',
    upi_id: shop.upi_id ?? '',
    upi_payee_name: shop.upi_payee_name ?? shop.name,
    upi_enabled: shop.upi_enabled ?? false,
  });

  const [locating, setLocating] = useState(false);
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Location not available', description: 'Please type the coordinates instead.', variant: 'destructive' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setShopForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
        toast({ title: 'Location captured', description: 'Remember to save your changes.' });
      },
      () => {
        setLocating(false);
        toast({
          title: 'Could not get your location',
          description: 'Allow location for this app in your phone settings, or type the coordinates.',
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };


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
    const upi = shopForm.upi_id.trim();
    const problem = firstError(
      checkMobile(shopForm.phone, 'Mobile number'),
      checkOptionalMobile(shopForm.whatsapp, 'WhatsApp number'),
      checkAmount(shopForm.min_order_amount || 0, 'Minimum order amount'),
      checkLatitude(shopForm.latitude),
      checkLongitude(shopForm.longitude),
      checkLink(shopForm.map_link, 'Map link'),
      shopForm.upi_enabled && !isValidVpa(upi)
        ? 'Check your UPI ID — it should look like yourname@bank, exactly as your payment app shows it.'
        : null,
      !shopForm.delivery_available && !shopForm.pickup_available ? 'Choose delivery, pickup, or both.' : null,
    );
    if (problem) {
      toast({ title: problem, variant: 'destructive' });
      return;
    }
    try {
      await updateMyShop(shop.id, {
        ...shopForm,
        whatsapp: shopForm.whatsapp.trim() || null,
        area: shopForm.area.trim() || null,
        map_link: shopForm.map_link.trim() || null,
        latitude: shopForm.latitude ? Number(shopForm.latitude) : null,
        longitude: shopForm.longitude ? Number(shopForm.longitude) : null,
        upi_id: upi || null,
        upi_payee_name: shopForm.upi_payee_name.trim() || shop.name,
        min_order_amount: Number(shopForm.min_order_amount) || 0,
      });
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
            <h2 className="text-sm font-bold text-gray-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                {draft.id ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {draft.id ? 'Edit product' : 'Add a product'}
              </span>
              {draft.id && (
                <button onClick={() => { resetDraft(); setFile(null); }} className="text-gray-400" aria-label="Cancel editing">
                  <X className="w-4 h-4" />
                </button>
              )}
            </h2>
            <input className={field} placeholder="Product name" value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <textarea className={field} rows={2} placeholder="Description (optional)" value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <div className="flex gap-2">
              <input className={field} type="number" min={0} placeholder="Price ₹" value={draft.price || ''} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
              <input className={field} type="number" min={0} placeholder="MRP ₹ (optional)" value={draft.mrp ?? ''} onChange={(e) => setDraft({ ...draft, mrp: e.target.value === '' ? null : Number(e.target.value) })} />
            </div>
            <div className="flex gap-2">
              <input className={field} placeholder="Unit e.g. kg" value={draft.unit ?? ''} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
              <input className={field} placeholder="Category (optional)" value={draft.category ?? ''} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 rounded-xl p-2">
              <input
                type="checkbox"
                checked={!!draft.track_stock}
                onChange={(e) => setDraft({ ...draft, track_stock: e.target.checked })}
              />
              <span className="flex-1">Keep count of stock</span>
              {draft.track_stock && (
                <input
                  type="number"
                  min={0}
                  value={draft.stock_qty ?? 0}
                  onChange={(e) => setDraft({ ...draft, stock_qty: Number(e.target.value) })}
                  className="w-20 px-2 py-1 rounded-lg border border-gray-200 text-xs"
                  placeholder="Qty"
                />
              )}
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 rounded-xl p-2 cursor-pointer">
              <Package className="w-4 h-4 text-emerald-600" />
              <span className="flex-1">
                {file ? `${file.name} · ${kb(file.size)} (shrunk to about 40 KB)` : 'Product photo (optional)'}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <button
              onClick={submitProduct}
              disabled={savingProduct}
              className="w-full py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              {savingProduct ? 'Saving…' : draft.id ? 'Save product' : 'Add product'}
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
                  {p.mrp && Number(p.mrp) > Number(p.price) && (
                    <span className="line-through text-gray-400 ml-1">{formatMoney(Number(p.mrp))}</span>
                  )}
                  {p.unit ? ` / ${p.unit}` : ''}
                </p>
                {p.track_stock && <p className="text-[10px] text-gray-500">{p.stock_qty} in stock</p>}
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
              <button
                onClick={() => { setDraft(p); setFile(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="text-gray-500 p-1"
                aria-label="Edit product"
              >
                <Pencil className="w-4 h-4" />
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
          <input className={field} placeholder="Mobile number" inputMode="numeric" maxLength={13} value={shopForm.phone} onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })} />
          <input className={field} placeholder="WhatsApp number (optional)" inputMode="numeric" maxLength={13} value={shopForm.whatsapp} onChange={(e) => setShopForm({ ...shopForm, whatsapp: e.target.value })} />
          <textarea className={field} rows={2} placeholder="Address" value={shopForm.address} onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })} />
          <input className={field} placeholder="Area / locality" value={shopForm.area} onChange={(e) => setShopForm({ ...shopForm, area: e.target.value })} />
          <input className={field} placeholder="Opening hours" value={shopForm.timings} onChange={(e) => setShopForm({ ...shopForm, timings: e.target.value })} />
          <textarea className={field} rows={2} placeholder="Description" value={shopForm.description} onChange={(e) => setShopForm({ ...shopForm, description: e.target.value })} />

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1">
              <MapPin className="w-4 h-4 text-emerald-600" /> Where your shop is
            </h3>
            <p className="text-[11px] text-gray-500">
              Pin the exact spot so customers get accurate directions.
            </p>
            <button
              onClick={useMyLocation}
              disabled={locating}
              className="w-full py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold disabled:opacity-60"
            >
              {locating ? 'Getting your location…' : 'Use my current location'}
            </button>
            <div className="flex gap-2">
              <input className={field} placeholder="Latitude" value={shopForm.latitude} onChange={(e) => setShopForm({ ...shopForm, latitude: e.target.value })} />
              <input className={field} placeholder="Longitude" value={shopForm.longitude} onChange={(e) => setShopForm({ ...shopForm, longitude: e.target.value })} />
            </div>
            <input className={field} placeholder="Map link (optional)" value={shopForm.map_link} onChange={(e) => setShopForm({ ...shopForm, map_link: e.target.value })} />
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1">
              <IndianRupee className="w-4 h-4 text-emerald-600" /> Your UPI payment details
            </h3>
            <p className="text-[11px] text-gray-500">
              Customers can pay you directly at checkout. Money goes straight to your UPI ID — the app
              never holds it.
            </p>
            <label className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 rounded-xl p-2">
              <input
                type="checkbox"
                checked={shopForm.upi_enabled}
                onChange={(e) => setShopForm({ ...shopForm, upi_enabled: e.target.checked })}
              />
              <span className="flex-1">Accept UPI payment at checkout</span>
            </label>
            <input className={field} placeholder="Your UPI ID e.g. shopname@upi" value={shopForm.upi_id} onChange={(e) => setShopForm({ ...shopForm, upi_id: e.target.value })} />
            <input className={field} placeholder="Name shown while paying" value={shopForm.upi_payee_name} onChange={(e) => setShopForm({ ...shopForm, upi_payee_name: e.target.value })} />
          </div>
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
