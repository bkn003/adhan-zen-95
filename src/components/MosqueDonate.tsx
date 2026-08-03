import React, { useEffect, useState } from 'react';
import { HandCoins, Copy, Check, X, Smartphone, Building2, QrCode, Share2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';


interface DonationInfo {
  donation_enabled?: boolean | null;
  donation_upi_id?: string | null;
  donation_account_holder?: string | null;
  donation_bank_name?: string | null;
  donation_account_number?: string | null;
  donation_ifsc?: string | null;
  donation_notes?: string | null;
}

interface Props {
  mosqueName: string;
  locationId: string;
  info?: DonationInfo | null;
  /** 'full' = big CTA button (mosque page), 'compact' = slim home-screen shortcut */
  variant?: 'full' | 'compact';
}

const isMobile = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const UPI_APPS: { label: string; scheme: string; color: string }[] = [
  { label: 'Google Pay', scheme: 'tez://upi/pay', color: 'from-blue-500 to-sky-500' },
  { label: 'PhonePe', scheme: 'phonepe://pay', color: 'from-violet-600 to-purple-600' },
  { label: 'Paytm', scheme: 'paytmmp://pay', color: 'from-sky-600 to-blue-700' },
  { label: 'BHIM / Other', scheme: 'upi://pay', color: 'from-emerald-500 to-teal-600' },
];

const CopyRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy failed');
    }
  };
  return (
    <button
      onClick={copy}
      className="w-full flex items-center justify-between gap-2 bg-white rounded-xl border border-gray-100 px-3 py-2.5 text-left active:bg-gray-50"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
        <p className="text-sm font-bold text-gray-800 truncate">{value}</p>
      </div>
      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
    </button>
  );
};

export const MosqueDonate: React.FC<Props> = ({ mosqueName, locationId, info: baseInfo, variant = 'full' }) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | ''>('');
  const [details, setDetails] = useState<DonationInfo | null>(null);

  // Banking details are not publicly readable; the security-definer RPC returns
  // a row only when donations are enabled for that mosque — so it also tells us
  // whether the donate shortcut should appear at all.
  useEffect(() => {
    if (!locationId) return;
    let cancelled = false;
    setDetails(null);
    setAmount('');
    setOpen(false);
    (async () => {
      const { data } = await (supabase as any).rpc('get_mosque_donation_details', {
        p_location_id: locationId,
      });
      if (!cancelled) setDetails(Array.isArray(data) ? (data[0] ?? null) : (data ?? null));
    })();
    return () => { cancelled = true; };
  }, [locationId]);

  const info: DonationInfo = { ...(baseInfo ?? {}), ...(details ?? {}) };
  const enabled = !!(details?.donation_enabled ?? baseInfo?.donation_enabled);

  if (!enabled) return null;
  const hasUpi = !!info.donation_upi_id;
  const hasBank = !!(info.donation_account_number && info.donation_ifsc);
  if (!hasUpi && !hasBank) return null;

  const upiParams = () => {
    const p = new URLSearchParams({
      pa: info.donation_upi_id || '',
      pn: info.donation_account_holder || mosqueName,
      cu: 'INR',
      tn: `Donation to ${mosqueName}`,
    });
    if (amount && Number(amount) > 0) p.set('am', String(amount));
    return p.toString();
  };

  const upiLink = (scheme = 'upi://pay') => (info.donation_upi_id ? `${scheme}?${upiParams()}` : '');

  const payWith = (scheme: string) => {
    const link = upiLink(scheme);
    if (!link) return;
    window.location.href = link;
    // If no UPI app handles the scheme, nothing happens — hint the user.
    setTimeout(() => toast.info('No UPI app opened? Copy the UPI ID and pay manually.'), 2500);
  };

  const qrSrc = () => {
    const link = upiLink();
    if (!link) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}`;
  };

  const share = async () => {
    const text = `Donate to ${mosqueName}${info.donation_upi_id ? `\nUPI: ${info.donation_upi_id}` : ''}${info.donation_account_number ? `\nA/c: ${info.donation_account_number}\nIFSC: ${info.donation_ifsc}` : ''}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Donate to ${mosqueName}`, text }); return; } catch {}
    }
    await navigator.clipboard.writeText(text);
    toast.success('Donation details copied');
  };

  const mobile = isMobile();

  return (
    <>
      {variant === 'compact' ? (
        <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-2.5 shadow-md text-white">
          <button onClick={() => setOpen(true)} className="w-full flex items-center gap-2 active:scale-[0.99] transition">
            <span className="p-1.5 bg-white/20 rounded-xl shrink-0"><HandCoins className="w-4 h-4" /></span>
            <span className="min-w-0 flex-1 text-left leading-tight">
              <span className="block text-[12px] font-extrabold">Support this mosque</span>
              <span className="block text-[10px] opacity-90 truncate">{mosqueName}</span>
            </span>
            <ExternalLink className="w-3.5 h-3.5 opacity-90 shrink-0" />
          </button>
          {hasUpi && (
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {UPI_APPS.slice(0, 3).map((app) => (
                <button
                  key={app.label}
                  onClick={() => payWith(app.scheme)}
                  className="bg-white/95 text-gray-800 rounded-xl py-1.5 text-[10px] font-bold shadow-sm active:scale-[0.97]"
                >
                  {app.label.replace(' Pay', 'Pay')}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-4 shadow-xl text-white space-y-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-white/20 rounded-2xl shrink-0"><HandCoins className="w-6 h-6" /></span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold leading-tight">Donate to this mosque</p>
              <p className="text-[11px] opacity-90 truncate">{mosqueName}</p>
            </div>
          </div>
          {hasUpi ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {UPI_APPS.map((app) => (
                  <button
                    key={app.label}
                    onClick={() => payWith(app.scheme)}
                    className="bg-white/95 text-gray-800 rounded-xl py-2.5 text-xs font-bold shadow flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    <Smartphone className="w-3.5 h-3.5" /> {app.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setOpen(true)}
                className="w-full bg-black/25 rounded-xl py-2 text-xs font-bold active:scale-[0.99]"
              >
                Choose amount, QR &amp; bank details
              </button>
            </>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="w-full bg-white/95 text-gray-800 rounded-xl py-2.5 text-xs font-bold active:scale-[0.99]"
            >
              View bank transfer details
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-rose-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HandCoins className="w-5 h-5" />
                <div>
                  <p className="text-sm font-bold leading-tight">Donate</p>
                  <p className="text-[11px] opacity-90 truncate max-w-[220px]">{mosqueName}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 bg-white/20 rounded-xl">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {info.donation_notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-900 whitespace-pre-wrap">
                  {info.donation_notes}
                </div>
              )}

              {hasUpi && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-gray-800">Pay via UPI</h3>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[51, 101, 501, 1001].map(a => (
                      <button
                        key={a}
                        onClick={() => setAmount(a)}
                        className={`py-2 rounded-lg text-xs font-bold ${amount === a ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700'}`}
                      >
                        ₹{a}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="Custom amount (₹)"
                    value={amount}
                    onChange={e => setAmount(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 focus:border-emerald-400 outline-none"
                  />

                  {/* Deep links straight into the installed UPI apps */}
                  <div className="grid grid-cols-2 gap-2">
                    {UPI_APPS.map(app => (
                      <button
                        key={app.label}
                        onClick={() => payWith(app.scheme)}
                        className={`bg-gradient-to-r ${app.color} text-white rounded-xl py-2.5 text-xs font-bold shadow flex items-center justify-center gap-1.5 active:scale-[0.98]`}
                      >
                        <Smartphone className="w-3.5 h-3.5" /> {app.label}
                      </button>
                    ))}
                  </div>
                  {amount ? (
                    <p className="text-[10px] text-center text-gray-500">Paying ₹{amount} to {info.donation_upi_id}</p>
                  ) : (
                    <p className="text-[10px] text-center text-gray-400">Amount is optional — you can also enter it in your UPI app</p>
                  )}

                  {!mobile && (
                    <div className="flex flex-col items-center bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100">
                      <img src={qrSrc()} alt="UPI QR" className="w-44 h-44 rounded-xl bg-white p-2 shadow" />
                      <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1">
                        <QrCode className="w-3 h-3" /> Scan with any UPI app
                      </p>
                    </div>
                  )}

                  <CopyRow label="UPI ID" value={info.donation_upi_id!} />
                </div>
              )}

              {hasBank && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mt-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-gray-800">Bank Transfer</h3>
                  </div>
                  {info.donation_account_holder && (
                    <CopyRow label="Account Holder" value={info.donation_account_holder} />
                  )}
                  {info.donation_bank_name && (
                    <CopyRow label="Bank" value={info.donation_bank_name} />
                  )}
                  <CopyRow label="Account Number" value={info.donation_account_number!} />
                  <CopyRow label="IFSC" value={info.donation_ifsc!} />
                </div>
              )}

              <button
                onClick={share}
                className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Share Donation Details
              </button>

              <p className="text-[10px] text-gray-400 text-center pt-1 pb-2">
                Payments go directly to the mosque. Adhan Zen does not process or hold funds.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
