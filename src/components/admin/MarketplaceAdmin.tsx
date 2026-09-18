// Marketplace moderation for super admins and granted approvers.
// Everything privileged goes through the `shop-admin` edge function, which
// validates the caller's JWT and scopes non-super approvers to their areas.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, ShieldCheck, Flag, Users, Download, Pause, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { shopCall, formatMoney } from '@/utils/shopApi';
import { adminCall } from '@/utils/adminApi';

interface Whoami {
  is_super_admin: boolean;
  is_global_approver: boolean;
  location_ids: string[];
  can_review: boolean;
}

const STATUS_TABS = ['pending', 'approved', 'rejected', 'paused', 'all'] as const;

export const MarketplaceAdmin = ({ dark = false }: { dark?: boolean }) => {
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>('pending');
  const [grantEmail, setGrantEmail] = useState('');

  const who = useQuery<Whoami>({ queryKey: ['shop-whoami'], queryFn: () => shopCall('review_whoami') });
  const isSuper = !!who.data?.is_super_admin;
  const canReview = !!who.data?.can_review;

  const settings = useQuery({
    queryKey: ['shops-enabled-admin'],
    enabled: isSuper,
    queryFn: async () => {
      const res = await adminCall<{ settings?: { key: string; value: string }[] }>(
        'super_get_app_settings',
      );
      const map: Record<string, string> = {};
      for (const row of res.settings ?? []) map[row.key] = row.value;
      return map;
    },
  });
  const enabled = (settings.data?.shops_enabled ?? 'false') === 'true';

  const shops = useQuery({
    queryKey: ['shop-review-list', status],
    enabled: canReview,
    queryFn: () => shopCall<{ shops: any[] }>('list_shops', { status }).then((r) => r.shops),
  });

  const reports = useQuery({
    queryKey: ['shop-reported-products'],
    enabled: canReview,
    queryFn: () =>
      shopCall<{ products: any[]; reasons: Record<string, string[]> }>('list_reported_products'),
  });

  const approvers = useQuery({
    queryKey: ['shop-approvers'],
    enabled: isSuper,
    queryFn: () => shopCall<{ approvers: any[]; emails: Record<string, string> }>('list_approvers'),
  });

  const toggleEnabled = useMutation({
    mutationFn: async (next: boolean) => {
      await adminCall('super_set_app_settings', { data: { shops_enabled: String(next) } });
    },
    onSuccess: () => {
      toast.success('Marketplace setting saved');
      qc.invalidateQueries({ queryKey: ['shops-enabled-admin'] });
      qc.invalidateQueries({ queryKey: ['shops-enabled'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Could not save'),
  });

  const setShopStatus = useMutation({
    mutationFn: ({ id, next, reason }: { id: string; next: string; reason?: string }) =>
      shopCall('set_shop_status', { shop_id: id, status: next, reason }),
    onSuccess: () => {
      toast.success('Shop updated');
      qc.invalidateQueries({ queryKey: ['shop-review-list'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Could not update shop'),
  });

  const setHidden = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) =>
      shopCall('set_product_hidden', { product_id: id, hidden }),
    onSuccess: () => {
      toast.success('Product updated');
      qc.invalidateQueries({ queryKey: ['shop-reported-products'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Could not update product'),
  });

  const grant = useMutation({
    mutationFn: (email: string) => shopCall('grant_approver', { email, location_id: null }),
    onSuccess: () => {
      toast.success('Approver added');
      setGrantEmail('');
      qc.invalidateQueries({ queryKey: ['shop-approvers'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Could not add approver'),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => shopCall('revoke_approver', { id }),
    onSuccess: () => {
      toast.success('Approver removed');
      qc.invalidateQueries({ queryKey: ['shop-approvers'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Could not remove approver'),
  });

  const exportContacts = async () => {
    try {
      const { contacts } = await shopCall<{ contacts: any[] }>('list_marketing_contacts');
      if (!contacts?.length) {
        toast.info('No consented contacts yet');
        return;
      }
      const header = 'Name,Phone,Email,Shop,Mosque,Area,Joined\n';
      const rows = contacts
        .map((c) =>
          [c.name, c.phone, c.email ?? '', c.shop, c.mosque, c.area, c.joined_at]
            .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
            .join(','),
        )
        .join('\n');
      const url = URL.createObjectURL(new Blob([header + rows], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `marketplace-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message || 'Export failed');
    }
  };

  if (who.isLoading) return null;
  if (!canReview) return null;

  const card = dark
    ? 'bg-gray-900 border border-gray-800 rounded-2xl p-4'
    : 'bg-white border border-gray-200 rounded-2xl p-4 shadow-sm';
  const title = dark ? 'text-white' : 'text-gray-900';
  const sub = dark ? 'text-gray-400' : 'text-gray-500';
  const chipOff = dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600';
  const input = dark
    ? 'bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm w-full'
    : 'bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm w-full';

  return (
    <div className="space-y-4">
      {/* Master switch */}
      {isSuper && (
        <div className={card}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-rose-500" />
              <div>
                <p className={`text-sm font-bold ${title}`}>Halal Marketplace</p>
                <p className={`text-[10px] ${sub}`}>Show the Shops tab across the app</p>
              </div>
            </div>
            <Button
              size="sm"
              variant={enabled ? 'default' : 'outline'}
              onClick={() => toggleEnabled.mutate(!enabled)}
              disabled={toggleEnabled.isPending}
            >
              {enabled ? 'On' : 'Off'}
            </Button>
          </div>
        </div>
      )}

      {/* Applications */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <p className={`text-sm font-bold ${title}`}>Shop applications</p>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`text-[11px] font-semibold px-3 py-1 rounded-full capitalize ${
                status === s ? 'bg-emerald-500 text-white' : chipOff
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {shops.isLoading && <p className={`text-xs ${sub}`}>Loading…</p>}
        {shops.data?.length === 0 && <p className={`text-xs ${sub}`}>Nothing here.</p>}
        <div className="space-y-3">
          {(shops.data ?? []).map((s: any) => (
            <div key={s.id} className={dark ? 'rounded-xl bg-gray-800/60 p-3' : 'rounded-xl bg-gray-50 p-3'}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-sm font-bold truncate ${title}`}>{s.name}</p>
                  <p className={`text-[11px] ${sub}`}>
                    {s.category} · {s.owner_name} · {s.phone}
                  </p>
                  <p className={`text-[11px] ${sub}`}>
                    {[s.area, s.locations?.mosque_name, s.locations?.district].filter(Boolean).join(' · ')}
                  </p>
                  <p className={`text-[11px] ${sub}`}>
                    Min order {formatMoney(s.min_order_amount)} ·{' '}
                    {s.delivery_available ? 'Delivery' : 'No delivery'} ·{' '}
                    {s.pickup_available ? 'Pickup' : 'No pickup'}
                  </p>
                  {s.halal_declared && (
                    <span className="inline-block mt-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Halal declared
                    </span>
                  )}
                  {s.rejection_reason && (
                    <p className="text-[11px] text-red-500 mt-1">Reason: {s.rejection_reason}</p>
                  )}
                </div>
                <span className={`text-[10px] font-bold uppercase ${sub}`}>{s.status}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {s.status !== 'approved' && (
                  <Button size="sm" onClick={() => setShopStatus.mutate({ id: s.id, next: 'approved' })}>
                    <Check className="w-3 h-3 mr-1" /> Approve
                  </Button>
                )}
                {s.status !== 'rejected' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const reason = window.prompt('Reason for rejection?') ?? '';
                      if (reason.trim()) setShopStatus.mutate({ id: s.id, next: 'rejected', reason });
                    }}
                  >
                    <X className="w-3 h-3 mr-1" /> Reject
                  </Button>
                )}
                {s.status === 'approved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const reason = window.prompt('Why pause this shop?') ?? '';
                      setShopStatus.mutate({ id: s.id, next: 'paused', reason });
                    }}
                  >
                    <Pause className="w-3 h-3 mr-1" /> Pause
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reported products */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-3">
          <Flag className="w-4 h-4 text-amber-500" />
          <p className={`text-sm font-bold ${title}`}>Reported products</p>
        </div>
        {reports.data?.products?.length === 0 && <p className={`text-xs ${sub}`}>No reports.</p>}
        <div className="space-y-3">
          {(reports.data?.products ?? []).map((p: any) => (
            <div key={p.id} className={dark ? 'rounded-xl bg-gray-800/60 p-3' : 'rounded-xl bg-gray-50 p-3'}>
              <p className={`text-sm font-bold ${title}`}>{p.name}</p>
              <p className={`text-[11px] ${sub}`}>
                {p.shops?.name} · {formatMoney(p.price)} · {p.report_count} report(s) ·{' '}
                {p.is_hidden ? 'hidden' : 'visible'}
              </p>
              {(reports.data?.reasons?.[p.id] ?? []).slice(0, 3).map((r: string, i: number) => (
                <p key={i} className={`text-[11px] italic ${sub}`}>
                  “{r}”
                </p>
              ))}
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setHidden.mutate({ id: p.id, hidden: !p.is_hidden })}
                >
                  {p.is_hidden ? 'Restore product' : 'Hide product'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const reason = window.prompt('Why pause this shop?') ?? '';
                    setShopStatus.mutate({ id: p.shops?.id, next: 'paused', reason });
                  }}
                >
                  Pause shop
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Approvers + campaign list (super admin only) */}
      {isSuper && (
        <>
          <div className={card}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-blue-500" />
              <p className={`text-sm font-bold ${title}`}>Who can approve shops</p>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                className={input}
                placeholder="Account email"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
              />
              <Button
                size="sm"
                onClick={() => grantEmail.trim() && grant.mutate(grantEmail.trim())}
                disabled={grant.isPending}
              >
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {(approvers.data?.approvers ?? []).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${title}`}>
                      {approvers.data?.emails?.[a.user_id] ?? a.user_id}
                    </p>
                    <p className={`text-[10px] ${sub}`}>
                      {a.locations?.mosque_name ? `${a.locations.mosque_name}` : 'All areas'}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => revoke.mutate(a.id)}>
                    Remove
                  </Button>
                </div>
              ))}
              {approvers.data?.approvers?.length === 0 && (
                <p className={`text-xs ${sub}`}>Only super admins can approve right now.</p>
              )}
            </div>
          </div>

          <div className={card}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-violet-500" />
                <div>
                  <p className={`text-sm font-bold ${title}`}>Campaign contact list</p>
                  <p className={`text-[10px] ${sub}`}>Only customers who agreed to be contacted</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={exportContacts}>
                Export CSV
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
