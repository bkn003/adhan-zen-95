import React, { useEffect, useState } from 'react';
import { HandCoins, Info, ShieldAlert } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { loadShowMosqueDonations, saveShowMosqueDonations } from '@/utils/donationPrefs';

/**
 * Settings control for mosque donation visibility. When the super admin turns the
 * platform-wide switch off, donations are hidden everywhere and the reason is
 * stated clearly here instead of silently disappearing.
 */
export const DonationSettings: React.FC = () => {
  const [show, setShow] = useState(loadShowMosqueDonations());
  const [platformEnabled, setPlatformEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('key, value')
          .eq('key', 'mosque_donations_enabled');
        if (!cancelled) setPlatformEnabled((data?.[0]?.value ?? 'true') === 'true');
      } catch {
        if (!cancelled) setPlatformEnabled(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="p-1.5 bg-amber-50 rounded-lg shrink-0">
            <HandCoins className="w-4 h-4 text-amber-600" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium text-gray-700 block">Show mosque donations</span>
            <p className="text-xs text-gray-500">
              Display each mosque's UPI / bank donation option on its page and the home screen.
            </p>
          </div>
        </div>
        <Switch
          checked={show && platformEnabled !== false}
          disabled={platformEnabled === false}
          onCheckedChange={(v) => { setShow(v); saveShowMosqueDonations(v); }}
          className="data-[state=checked]:bg-amber-500 shrink-0 ml-2"
        />
      </div>

      {platformEnabled === false && (
        <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Mosque donations are currently switched off platform-wide by the app's super admin
            (a safety measure against misuse). No mosque donation details are shown until it is
            re-enabled — mosque admins cannot override this.
          </p>
        </div>
      )}

      <div className="flex gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl">
        <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600 leading-relaxed">
          Mosque donations go directly to that mosque's own account. Support for the app's
          development is a separate, clearly-labelled card and never reaches a mosque.
        </p>
      </div>
    </div>
  );
};
