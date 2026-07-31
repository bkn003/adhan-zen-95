import React, { useState } from 'react';
import { HandCoins, Copy, Check, X, Smartphone, Building2, QrCode, Share2 } from 'lucide-react';
import { toast } from 'sonner';

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
  info: DonationInfo | null | undefined;
}


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

export const MosqueDonate: React.FC<Props> = ({ mosqueName, info }) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | ''>('');

  if (!info?.donation_enabled) return null;
  const hasUpi = !!info.donation_upi_id;
  const hasBank = !!(info.donation_account_number && info.donation_ifsc);
  if (!hasUpi && !hasBank) return null;

  const upiLink = () => {
    if (!info.donation_upi_id) return '';
    const p = new URLSearchParams({
      pa: info.donation_upi_id,
      pn: info.donation_account_holder || mosqueName,
      cu: 'INR',
      tn: `Donation to ${mosqueName}`,
    });
    if (amount && Number(amount) > 0) p.set('am', String(amount));
    return `upi://pay?${p.toString()}`;
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white rounded-2xl py-3 px-4 font-bold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition"
      >
        <HandCoins className="w-5 h-5" />
        Donate to {mosqueName.length > 20 ? 'this Mosque' : mosqueName}
      </button>

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

                  <div className="flex flex-col items-center bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100">
                    <img
                      src={qrSrc()}
                      alt="UPI QR"
                      className="w-44 h-44 rounded-xl bg-white p-2 shadow"
                    />
                    <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1">
                      <QrCode className="w-3 h-3" /> Scan with any UPI app
                    </p>
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

                  <a
                    href={upiLink()}
                    className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl py-3 font-bold text-sm shadow"
                  >
                    <Smartphone className="w-4 h-4" /> Open UPI App {amount ? `· ₹${amount}` : ''}
                  </a>

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
