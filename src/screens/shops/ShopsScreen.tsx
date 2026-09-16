import { useEffect, useMemo, useState } from 'react';
import { Search, Store, MapPin, ShieldCheck, Truck, ShoppingBag, Plus, ClipboardList } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useGeolocation } from '@/hooks/useGeolocation';
import { listPublicShops, isMarketplaceEnabled, SHOP_CATEGORIES, distanceKm, formatMoney, type Shop } from '@/utils/shopApi';

interface Props {
  onOpenShop: (shopId: string) => void;
  onApply: () => void;
  onMyOrders: () => void;
  onManageShop: () => void;
  hasShop: boolean;
}

export const ShopsScreen = ({ onOpenShop, onApply, onMyOrders, onManageShop, hasShop }: Props) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const { latitude, longitude } = useGeolocation();

  const enabled = useQuery({ queryKey: ['shops-enabled'], queryFn: isMarketplaceEnabled });
  const shops = useQuery({
    queryKey: ['public-shops'],
    queryFn: listPublicShops,
    enabled: enabled.data === true,
  });

  const withDistance = useMemo(() => {
    const list = (shops.data ?? []).map((s) => ({
      shop: s,
      km:
        latitude && longitude && s.latitude && s.longitude
          ? distanceKm(latitude, longitude, Number(s.latitude), Number(s.longitude))
          : null,
    }));
    const q = search.trim().toLowerCase();
    return list
      .filter(({ shop }) => (category === 'all' ? true : shop.category === category))
      .filter(({ shop }) =>
        q
          ? shop.name.toLowerCase().includes(q) ||
            (shop.area ?? '').toLowerCase().includes(q) ||
            (shop.address ?? '').toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => {
        if (a.km == null && b.km == null) return a.shop.name.localeCompare(b.shop.name);
        if (a.km == null) return 1;
        if (b.km == null) return -1;
        return a.km - b.km;
      });
  }, [shops.data, latitude, longitude, search, category]);

  if (enabled.isLoading) {
    return <div className="p-6 pb-24 text-center text-gray-500">Loading…</div>;
  }

  if (enabled.data !== true) {
    return (
      <div className="min-h-screen pb-24 px-4 pt-10 text-center">
        <Store className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
        <h1 className="text-lg font-bold text-gray-800">Halal Shops</h1>
        <p className="text-sm text-gray-600 mt-2 max-w-sm mx-auto">
          The halal marketplace is not open yet in your area. It will appear here as soon as
          nearby shops are approved.
        </p>
        <button
          onClick={onApply}
          className="mt-5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
        >
          Sell on the app
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-4 pt-6 pb-5 text-white">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" /> Halal Shops
        </h1>
        <p className="text-xs text-white/80 mt-1">Halal-only shops near your mosque</p>
        <div className="mt-3 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shops or area"
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm text-gray-800 bg-white outline-none"
          />
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {['all', ...SHOP_CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                category === c ? 'bg-white text-emerald-700' : 'bg-white/20 text-white'
              }`}
            >
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4 flex gap-2">
        <button
          onClick={onMyOrders}
          className="flex-1 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 flex items-center justify-center gap-1"
        >
          <ClipboardList className="w-4 h-4" /> My orders
        </button>
        <button
          onClick={hasShop ? onManageShop : onApply}
          className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1"
        >
          <Plus className="w-4 h-4" /> {hasShop ? 'My shop' : 'Sell on the app'}
        </button>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {shops.isLoading && <p className="text-sm text-gray-500 text-center">Loading shops…</p>}
        {!shops.isLoading && withDistance.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No shops found yet.</p>
        )}
        {withDistance.map(({ shop, km }) => (
          <ShopCard key={shop.id} shop={shop} km={km} onOpen={() => onOpenShop(shop.id)} />
        ))}
      </div>
    </div>
  );
};

const ShopCard = ({ shop, km, onOpen }: { shop: Shop; km: number | null; onOpen: () => void }) => (
  <button
    onClick={onOpen}
    className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.99] transition"
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="font-bold text-gray-800 truncate">{shop.name}</h3>
        <p className="text-[11px] text-gray-500 mt-0.5">{shop.category}</p>
      </div>
      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
        <ShieldCheck className="w-3 h-3" /> Halal declared
      </span>
    </div>
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-600">
      {(shop.area || shop.locations?.mosque_name) && (
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {shop.area || shop.locations?.mosque_name}
        </span>
      )}
      {km != null && <span>{km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}</span>}
      {shop.delivery_available && (
        <span className="flex items-center gap-1">
          <Truck className="w-3 h-3" /> Delivery
        </span>
      )}
      {shop.pickup_available && <span>Pickup</span>}
      {shop.min_order_amount > 0 && <span>Min {formatMoney(shop.min_order_amount)}</span>}
    </div>
    {shop.timings && <p className="text-[11px] text-gray-500 mt-1">{shop.timings}</p>}
  </button>
);
