import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Phone, MapPin, ShieldCheck, Flag, Minus, Plus, Navigation, Volume2, Square, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { playShopVoice, stopShopVoice } from '@/utils/shopVoice';
import {
  getShop,
  listShopProducts,
  getShopMediaUrls,
  reportProduct,
  formatMoney,
  type ShopProduct,
} from '@/utils/shopApi';

export interface CartLine {
  product: ShopProduct;
  qty: number;
}

interface Props {
  shopId: string;
  onBack: () => void;
  onCheckout: (shopId: string, lines: CartLine[]) => void;
}

export const ShopDetailsScreen = ({ shopId, onBack, onCheckout }: Props) => {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const { language } = useLanguage();
  const [voice, setVoice] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [speed, setSpeed] = useState(1);

  const shop = useQuery({ queryKey: ['shop', shopId], queryFn: () => getShop(shopId) });
  const products = useQuery({ queryKey: ['shop-products', shopId], queryFn: () => listShopProducts(shopId) });

  useEffect(() => {
    const paths = [
      ...(products.data ?? []).map((p) => p.photo_path).filter(Boolean),
      shop.data?.halal_certificate_path,
    ].filter(Boolean) as string[];
    if (paths.length === 0) return;
    getShopMediaUrls(paths).then(setPhotoUrls);
  }, [products.data, shop.data?.halal_certificate_path]);

  const lines: CartLine[] = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const product = (products.data ?? []).find((p) => p.id === id);
          return product ? { product, qty } : null;
        })
        .filter(Boolean) as CartLine[],
    [cart, products.data],
  );
  const total = lines.reduce((s, l) => s + Number(l.product.price) * l.qty, 0);
  const minOrder = Number(shop.data?.min_order_amount ?? 0);

  const setQty = (id: string, qty: number) =>
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });

  const handleReport = async (product: ShopProduct) => {
    const reason = window.prompt('Why are you reporting this product?') ?? '';
    if (reason === null) return;
    try {
      await reportProduct(product.id, reason);
      toast({ title: 'Reported', description: 'Thank you. Our team will review this product.' });
    } catch (e: any) {
      toast({ title: 'Could not report', description: e.message, variant: 'destructive' });
    }
  };

  useEffect(() => () => stopShopVoice(), []);

  const listen = async () => {
    if (voice !== 'idle') {
      stopShopVoice();
      setVoice('idle');
      return;
    }
    if (!shop.data) return;
    setVoice('loading');
    try {
      setVoice('playing');
      await playShopVoice({
        shop: shop.data,
        products: products.data ?? [],
        lang: language,
        rate: speed,
      });
    } catch (e: any) {
      toast({ title: 'No voice available', description: e?.message, variant: 'destructive' });
    } finally {
      setVoice('idle');
    }
  };

  if (shop.isLoading) return <div className="p-6 text-center text-gray-500">Loading…</div>;
  if (!shop.data) return <div className="p-6 text-center text-gray-500">Shop not found.</div>;

  const s = shop.data;

  return (
    <div className="min-h-screen pb-32">
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-4 pt-5 pb-5 text-white">
        <button onClick={onBack} className="flex items-center gap-1 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl font-bold">{s.name}</h1>
        <p className="text-xs text-white/80 mt-0.5">{s.category}</p>
        <span className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold">
          <ShieldCheck className="w-3 h-3" /> Halal-only declaration signed
        </span>
      </div>

      <div className="px-4 mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2 text-sm text-gray-700">
        {s.address && (
          <p className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 text-emerald-600" /> {s.address}
          </p>
        )}
        {s.timings && <p className="text-xs text-gray-500">Open: {s.timings}</p>}
        <p className="text-xs text-gray-500">
          {s.delivery_available ? 'Delivery available' : 'Pickup only'}
          {minOrder > 0 && ` · Minimum order ${formatMoney(minOrder)}`}
        </p>
        {s.description && <p className="text-xs text-gray-600">{s.description}</p>}
        <div className="flex gap-2 pt-1">
          <a
            href={`tel:${s.phone}`}
            className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1"
          >
            <Phone className="w-4 h-4" /> Call shop
          </a>
          {s.map_link && (
            <a
              href={s.map_link}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 flex items-center justify-center gap-1"
            >
              <Navigation className="w-4 h-4" /> Directions
            </a>
          )}
        </div>
        <div className="pt-1 border-t border-gray-100 mt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={listen}
              className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1"
            >
              {voice === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : voice === 'playing' ? (
                <Square className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              {voice === 'idle' ? 'Listen to this shop' : 'Stop'}
            </button>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="px-2 py-2 rounded-xl border border-gray-200 text-[11px] bg-white"
              aria-label="Voice speed"
            >
              {[0.8, 1, 1.25].map((r) => (
                <option key={r} value={r}>{r}×</option>
              ))}
            </select>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            Plays the shop's own recording when available, otherwise reads the listing aloud in your language.
          </p>
        </div>
        {s.halal_certificate_path && photoUrls[s.halal_certificate_path] && (
          <a
            href={photoUrls[s.halal_certificate_path]}
            target="_blank"
            rel="noreferrer"
            className="block text-xs font-semibold text-emerald-700 underline pt-1"
          >
            View halal certificate
          </a>
        )}
      </div>

      <div className="px-4 mt-5 space-y-3">
        <h2 className="text-sm font-bold text-gray-800">Products</h2>
        {products.isLoading && <p className="text-sm text-gray-500">Loading products…</p>}
        {!products.isLoading && (products.data ?? []).length === 0 && (
          <p className="text-sm text-gray-500">This shop has not added products yet.</p>
        )}
        {(products.data ?? []).map((p) => {
          const qty = cart[p.id] ?? 0;
          return (
            <div key={p.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-3">
              {p.photo_path && photoUrls[p.photo_path] ? (
                <img
                  src={photoUrls[p.photo_path]}
                  alt={p.name}
                  loading="lazy"
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-emerald-50 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-800 truncate">{p.name}</h3>
                  <button onClick={() => handleReport(p)} className="text-gray-400 shrink-0" aria-label="Report product">
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </div>
                {p.description && <p className="text-[11px] text-gray-500 line-clamp-2">{p.description}</p>}
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-sm font-bold text-emerald-700">
                    {formatMoney(Number(p.price))}
                    {p.unit && <span className="text-[10px] font-normal text-gray-500"> / {p.unit}</span>}
                  </span>
                  {!p.is_available ? (
                    <span className="text-[10px] font-semibold text-gray-400">Out of stock</span>
                  ) : qty === 0 ? (
                    <button
                      onClick={() => setQty(p.id, 1)}
                      className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold"
                    >
                      Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQty(p.id, qty - 1)} className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-semibold w-4 text-center">{qty}</span>
                      <button onClick={() => setQty(p.id, qty + 1)} className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {lines.length > 0 && (
        <div className="fixed bottom-14 left-0 right-0 px-4 pb-2 z-40">
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">{lines.length} item(s)</p>
              <p className="text-base font-bold text-gray-800">{formatMoney(total)}</p>
            </div>
            <button
              disabled={total < minOrder}
              onClick={() => onCheckout(shopId, lines)}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              {total < minOrder ? `Min ${formatMoney(minOrder)}` : 'Place order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
