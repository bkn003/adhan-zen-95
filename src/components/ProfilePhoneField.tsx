import React from 'react';
import { Phone, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Lets a signed-in member add or update the mobile number their mosque admin
 * sees next to jamaat attendance.
 */
export const ProfilePhoneField: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [phone, setPhone] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      const { data } = await supabase.from('profiles').select('phone').eq('id', user.id).maybeSingle();
      setPhone(((data as { phone?: string | null } | null)?.phone) ?? '');
      setLoaded(true);
    })();
  }, [user?.id]);

  const save = async () => {
    if (!user?.id) return;
    const clean = phone.replace(/[^\d+]/g, '');
    if (clean && clean.replace(/\D/g, '').length < 8) {
      toast.error('Enter a valid mobile number');
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({ phone: clean || null } as never)
      .eq('id', user.id);
    setBusy(false);
    if (error) { toast.error('Could not save your mobile number'); return; }
    await refreshProfile();
    toast.success('Mobile number saved');
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-gray-500">Mobile number</p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="tel"
            inputMode="tel"
            maxLength={16}
            disabled={!loaded}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ''))}
            placeholder="e.g. +91 98765 43210"
            className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-indigo-400 disabled:opacity-60"
          />
        </div>
        <button
          onClick={() => void save()}
          disabled={busy || !loaded}
          className="px-3 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-[10px] text-gray-400">
        Visible only to the admin of the mosque where you mark jamaat attendance.
      </p>
    </div>
  );
};
