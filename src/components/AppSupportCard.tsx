import React, { useEffect, useState } from 'react';
import { Heart, Smartphone, QrCode, Copy, Check, X, Info, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { buildUpiUrl, openUpiApp, upiQrSrc } from '@/utils/upi';
import { supabase } from '@/integrations/supabase/client';

export interface AppDonationConfig {
  enabled: boolean;
  upiId: string;
  payee: string;
  note: string;
}

export const APP_DONATION_KEYS = {
  enabled: 'app_donation_enabled',
  upi: 'app_donation_upi_id',
  payee: 'app_donation_payee',
  note: 'app_donation_note',
} as const;

/** Reads the super-admin managed app-support UPI configuration. */
export async function fetchAppDonationConfig(): Promise<AppDonationConfig | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', Object.values(APP_DONATION_KEYS) as string[]);
  if (error || !data) return null;
  const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
  return {
    enabled: map[APP_DONATION_KEYS.enabled] === 'true',
    upiId: map[APP_DONATION_KEYS.upi] || '',
    payee: map[APP_DONATION_KEYS.payee] || 'Adhan Zen',
    note: map[APP_DONATION_KEYS.note] || '',
  };
}

const UPI_APPS = [
  { label: 'Google Pay', scheme: 'tez://upi/pay' },
  { label: 'PhonePe', scheme: 'phonepe://pay' },
  { label: 'Paytm', scheme: 'paytmmp://pay' },
  { label: 'Any UPI app', scheme: 'upi://pay' },
];

const isMobile = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const DISCLAIMER =
  'This contribution supports the development, hosting and maintenance of the Adhan Zen app. It is voluntary and non-refundable, it is not a mosque donation, not zakat or sadaqah, and it is not tax-deductible. Mosque donations are shown separately and go directly to that mosque.';

interface Props {
  /** 'compact' for the home screen, 'full' inside a mosque page. */
  variant?: 'compact' | 'full';
}

/**
 * App-development support card. Distinct blue/indigo styling so it can never be
 * confused with the amber mosque donation card.
 */
export const AppSupportCard: React.FC<Props> = ({ variant = 'compact' }) => {
  const [cfg, setCfg] = useState<AppDonationConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | ''>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAppDonationConfig().then((c) => { if (!cancelled) setCfg(c); });
    return () => { cancelled = true; };
  }, []);

  if (!cfg?.enabled || !cfg.upiId) return null;

  const link = (scheme = 'upi://pay') =>
    buildUpiUrl(scheme, {
      pa: cfg.upiId,
      pn: cfg.payee || 'Adhan Zen',
      amount,
      note: 'Adhan Zen app support',
    });

  const payWith = (scheme: string) => {
    const url = link(scheme);
    if (!url) {
      toast.error('The support UPI ID is not configured correctly.');
      return;
    }
    const launched = openUpiApp(url, () => {
      toast.info('No UPI app opened? Scan the QR or copy the UPI ID.');
      setOpen(true);
    });
    if (!launched) {
      setOpen(true);
      toast.info('UPI apps only open on a phone. Scan the QR or copy the UPI ID.');
    }
  };


  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cfg.upiId);
      setCopied(true);
      toast.success('UPI ID copied');
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error('Copy failed'); }
  };

  return (
    <>
      {variant === 'compact' ? (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 p-2.5 shadow-md text-white">
          <button onClick={() => setOpen(true)} className="w-full flex items-center gap-2 active:scale-[0.99] transition">
            <span className="p-1.5 bg-white/20 rounded-xl shrink-0"><Heart className="w-4 h-4" /></span>
            <span className="min-w-0 flex-1 text-left leading-tight">
              <span className="block text-[12px] font-extrabold">Support this app's development</span>
              <span className="block text-[10px] opacity-90 truncate">Goes to {cfg.payee} (UPI {cfg.upiId}) — the app developer</span>
            </span>
            <ExternalLink className="w-3.5 h-3.5 opacity-90 shrink-0" />
          </button>
          {isMobile() ? (
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {UPI_APPS.slice(0, 3).map((a) => (
                <button
                  key={a.label}
                  onClick={() => payWith(a.scheme)}
                  className="bg-white/95 text-gray-800 rounded-xl py-1.5 text-[10px] font-bold shadow-sm active:scale-[0.97]"
                >
                  {a.label.replace(' Pay', 'Pay')}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="w-full mt-2 bg-white/95 text-gray-800 rounded-xl py-1.5 text-[10px] font-bold shadow-sm flex items-center justify-center gap-1.5 active:scale-[0.97]"
            >
              <QrCode className="w-3 h-3" /> Show QR &amp; UPI ID
            </button>
          )}

          <p className="text-[9px] opacity-80 mt-1.5 leading-snug">Not a mosque donation — supports app development only.</p>
        </div>
      ) : (
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-600 p-4 shadow-xl text-white space-y-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-white/20 rounded-2xl shrink-0"><Heart className="w-6 h-6" /></span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold leading-tight">Support Adhan Zen development</p>
              <p className="text-[11px] opacity-90">Goes to {cfg.payee} (UPI {cfg.upiId}) — the app developer, not this mosque</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {UPI_APPS.map((a) => (
              <button
                key={a.label}
                onClick={() => payWith(a.scheme)}
                className="bg-white/95 text-gray-800 rounded-xl py-2.5 text-xs font-bold shadow flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <Smartphone className="w-3.5 h-3.5" /> {a.label}
              </button>
            ))}
          </div>
          <button onClick={() => setOpen(true)} className="w-full bg-black/25 rounded-xl py-2 text-xs font-bold active:scale-[0.99]">
            Choose amount, QR &amp; disclaimer
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-sky-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                <div>
                  <p className="text-sm font-bold leading-tight">Support the app</p>
                  <p className="text-[11px] opacity-90">{cfg.payee}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 bg-white/20 rounded-xl"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wide text-indigo-700 font-bold">Money goes to</p>
                <p className="text-sm font-bold text-gray-800">{cfg.payee}</p>
                <p className="text-[11px] text-gray-600">UPI: <span className="font-semibold">{cfg.upiId}</span></p>
                <p className="text-[10px] text-gray-500 mt-1">App development &amp; hosting — no mosque receives this amount.</p>
              </div>

              {cfg.note && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 whitespace-pre-wrap">
                  {cfg.note}
                </div>
              )}

              <div className="grid grid-cols-4 gap-1.5">
                {[51, 101, 501, 1001].map((a) => (
                  <button
                    key={a}
                    onClick={() => setAmount(a)}
                    className={`py-2 rounded-lg text-xs font-bold ${amount === a ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'}`}
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
                onChange={(e) => setAmount(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 outline-none"
              />

              <div className="grid grid-cols-2 gap-2">
                {UPI_APPS.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => payWith(a.scheme)}
                    className="bg-gradient-to-r from-indigo-600 to-sky-600 text-white rounded-xl py-2.5 text-xs font-bold shadow flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    <Smartphone className="w-3.5 h-3.5" /> {a.label}
                  </button>
                ))}
              </div>

              {!isMobile() && (
                <div className="flex flex-col items-center bg-gradient-to-br from-indigo-50 to-sky-50 rounded-2xl p-4 border border-indigo-100">
                  <img
                    src={upiQrSrc(link())}
                    alt="UPI QR for app support"
                    className="w-44 h-44 rounded-xl bg-white p-2 shadow"
                  />
                  <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1">
                    <QrCode className="w-3 h-3" /> Scan with any UPI app
                  </p>
                </div>
              )}

              <button
                onClick={copy}
                className="w-full flex items-center justify-between gap-2 bg-white rounded-xl border border-gray-100 px-3 py-2.5 text-left active:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">UPI ID</p>
                  <p className="text-sm font-bold text-gray-800 truncate">{cfg.upiId}</p>
                </div>
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-[11px] text-gray-600 leading-relaxed flex gap-2">
                <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <span>{DISCLAIMER}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
