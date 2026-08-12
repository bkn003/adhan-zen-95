import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, HandCoins } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  locationId: string;
  location: any;
}

const FIELDS: { key: string; label: string; placeholder: string; textarea?: boolean }[] = [
  { key: 'donation_account_holder', label: 'Account Holder / Trust Name', placeholder: 'e.g. Al-Noor Masjid Trust' },
  { key: 'donation_upi_id', label: 'UPI ID (VPA)', placeholder: 'masjidtrust@upi' },
  { key: 'donation_bank_name', label: 'Bank Name', placeholder: 'HDFC Bank' },
  { key: 'donation_account_number', label: 'Account Number', placeholder: '00123456789012' },
  { key: 'donation_ifsc', label: 'IFSC Code', placeholder: 'HDFC0001234' },
  { key: 'donation_notes', label: 'Notes to Donors (optional)', placeholder: 'Zakat / Sadaqah / Masjid renovation …', textarea: true },
];

export const DonationAdmin: React.FC<Props> = ({ locationId, location }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [platformEnabled, setPlatformEnabled] = useState(true);

  // Super admins can block all mosque donations app-wide (anti-fraud kill switch).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'mosque_donations_enabled')
        .maybeSingle();
      if (!cancelled) setPlatformEnabled((data?.value ?? 'true') === 'true');
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const next: Record<string, any> = { donation_enabled: !!location?.donation_enabled };
    FIELDS.forEach(f => { next[f.key] = location?.[f.key] ?? ''; });
    setForm(next);
  }, [locationId, location]);

  const save = async () => {
    setSaving(true);
    try {
      const patch: any = { donation_enabled: !!form.donation_enabled };
      FIELDS.forEach(f => { patch[f.key] = form[f.key]?.toString().trim() || null; });
      const { data, error } = await supabase.functions.invoke('mosque-admin', {
        body: { action: 'update_donation', location_id: locationId, data: patch },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success('Donation info saved');
      qc.invalidateQueries({ queryKey: ['locations'] });
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const destination =
    form.donation_account_holder?.toString().trim() ||
    (location?.mosque_name ?? 'this mosque');

  return (
    <div className="space-y-3">
      {!platformEnabled && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-700 font-semibold">
          Donations are currently disabled platform-wide by the Adhan Zen team. Your donate button is hidden in the app
          and cannot be enabled until they allow it again.
        </div>
      )}
      <label className="flex items-center justify-between p-3 bg-amber-50/60 border border-amber-100 rounded-xl">
        <div className="flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-amber-600" />
          <div>
            <p className="text-sm font-bold text-gray-800">Enable Donations</p>
            <p className="text-[11px] text-gray-500">Show a Donate button on the mosque page</p>
          </div>
        </div>
        <input
          type="checkbox"
          disabled={!platformEnabled}
          className="w-5 h-5 accent-amber-600 disabled:opacity-40"
          checked={platformEnabled && !!form.donation_enabled}
          onChange={e => setForm({ ...form, donation_enabled: e.target.checked })}
        />
      </label>

      {FIELDS.map(f => (
        <label key={f.key} className="block">
          <span className="text-xs font-semibold text-gray-600">{f.label}</span>
          {f.textarea ? (
            <textarea
              rows={2}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
              placeholder={f.placeholder}
              value={form[f.key] ?? ''}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
            />
          ) : (
            <input
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
              placeholder={f.placeholder}
              value={form[f.key] ?? ''}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
            />
          )}
        </label>
      ))}

      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
        <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-bold">Users will see</p>
        <p className="text-xs font-bold text-gray-800 mt-0.5">Money goes to {destination}</p>
        <p className="text-[11px] text-gray-600">
          {form.donation_upi_id ? <>UPI: <span className="font-semibold">{form.donation_upi_id}</span></> : 'No UPI ID yet'}
          {form.donation_account_number ? <> · A/c ••••{String(form.donation_account_number).slice(-4)}</> : null}
        </p>
      </div>

      <p className="text-[10px] text-gray-400 leading-snug">
        Funds go directly to this mosque's own account. Adhan Zen does not process, hold or take a cut of payments.
        Ensure account details are correct — wrong details mean lost donations.
      </p>

      <button
        onClick={save}
        disabled={saving || !platformEnabled}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Donation Info'}
      </button>
    </div>
  );
};
