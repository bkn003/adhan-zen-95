import { ArrowLeft, Phone, XCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { listMyOrders, cancelMyOrder, formatMoney } from '@/utils/shopApi';

const statusStyle: Record<string, string> = {
  placed: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  ready: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-50 text-red-600',
};

export const MyOrdersScreen = ({ onBack }: { onBack: () => void }) => {
  const { isSignedIn, openAuth } = useAuth();
  const qc = useQueryClient();
  const orders = useQuery({ queryKey: ['my-shop-orders'], queryFn: listMyOrders, enabled: isSignedIn });

  const cancel = async (id: string) => {
    try {
      await cancelMyOrder(id);
      qc.invalidateQueries({ queryKey: ['my-shop-orders'] });
      toast({ title: 'Order cancelled' });
    } catch (e: any) {
      toast({ title: 'Could not cancel', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-4 pt-5 pb-5 text-white">
        <button onClick={onBack} className="flex items-center gap-1 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl font-bold">My orders</h1>
      </div>

      {!isSignedIn && (
        <div className="px-4 mt-6 text-center">
          <p className="text-sm text-gray-600">Sign in to see the orders you placed.</p>
          <button
            onClick={() => openAuth('Sign in to see your orders')}
            className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
          >
            Sign in
          </button>
        </div>
      )}

      <div className="px-4 mt-4 space-y-3">
        {isSignedIn && orders.isLoading && <p className="text-sm text-gray-500 text-center">Loading…</p>}
        {isSignedIn && !orders.isLoading && (orders.data ?? []).length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">You have not placed any orders yet.</p>
        )}
        {(orders.data ?? []).map((o) => (
          <div key={o.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-800 truncate">{o.shops?.name ?? 'Shop'}</h3>
                <p className="text-[11px] text-gray-500">
                  {new Date(o.created_at).toLocaleString()} · {o.fulfilment}
                </p>
              </div>
              <span
                className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                  statusStyle[o.status] ?? 'bg-gray-100 text-gray-600'
                }`}
              >
                {o.status}
              </span>
            </div>
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
            <div className="flex justify-between items-center border-t border-gray-100 mt-2 pt-2">
              <span className="text-sm font-bold text-emerald-700">{formatMoney(Number(o.total_amount))}</span>
              <div className="flex gap-2">
                {o.shops?.phone && (
                  <a
                    href={`tel:${o.shops.phone}`}
                    className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-[11px] font-semibold text-gray-700 flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" /> Call
                  </a>
                )}
                {['placed', 'confirmed'].includes(o.status) && (
                  <button
                    onClick={() => cancel(o.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-semibold flex items-center gap-1"
                  >
                    <XCircle className="w-3 h-3" /> Cancel
                  </button>
                )}
              </div>
            </div>
            {o.status_note && <p className="text-[11px] text-gray-500 mt-1">Shop note: {o.status_note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
