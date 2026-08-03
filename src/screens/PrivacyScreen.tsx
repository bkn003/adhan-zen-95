import React, { useEffect, useState } from 'react';
import { ArrowLeft, ShieldCheck, Trash2, BarChart3, Bell, Database } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { cleanupPushTokens } from '@/native/pushRegistration';

interface Props { onBack: () => void }

const ANALYTICS_KEY = 'analyticsOptIn';

export const PrivacyScreen: React.FC<Props> = ({ onBack }) => {
  const [analytics, setAnalytics] = useState(() => localStorage.getItem(ANALYTICS_KEY) !== 'false');
  const [perm, setPerm] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) setPerm(Notification.permission);
  }, []);

  const requestPerm = async () => {
    if (!('Notification' in window)) return toast.error('Notifications not supported here');
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === 'denied') toast.info('Blocked — re-enable it in your browser/OS settings.');
  };

  const clearCaches = async () => {
    const keep = new Set(['adhan_zen_device_id', 'appLanguage', 'selectedLocationId']);
    Object.keys(localStorage)
      .filter((k) => k.startsWith('pt:') || k.startsWith('cache:') || k.startsWith('signedUrl:'))
      .forEach((k) => localStorage.removeItem(k));
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
    toast.success('Cached prayer & mosque data cleared');
    void keep;
  };

  const deleteDeviceData = async () => {
    await cleanupPushTokens();
    localStorage.removeItem('prayerTracker');
    localStorage.removeItem('quranBookmarks');
    toast.success('Device data removed');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-white pb-24">
      <div className="sticky top-0 z-20 bg-gradient-to-r from-slate-800 to-slate-700 text-white px-4 py-3 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl active:scale-95" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Privacy & Data</h1>
            <p className="text-[11px] opacity-85">You control what is collected and stored</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-sky-600" /> Anonymous usage analytics</p>
            <p className="text-[11px] text-gray-500">Screen views only, never your name or location history.</p>
          </div>
          <Switch
            checked={analytics}
            onCheckedChange={(v) => { setAnalytics(v); localStorage.setItem(ANALYTICS_KEY, String(v)); }}
            className="data-[state=checked]:bg-sky-500 shrink-0"
          />
        </div>

        <div className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm">
          <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5"><Bell className="w-4 h-4 text-emerald-600" /> Notification permission</p>
          <p className="text-[11px] text-gray-500 mb-2">Current status: <span className="font-semibold">{perm}</span></p>
          <button onClick={requestPerm} className="w-full py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold active:scale-[0.99]">
            {perm === 'granted' ? 'Re-check permission' : 'Allow notifications'}
          </button>
        </div>

        <div className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm space-y-2">
          <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5"><Database className="w-4 h-4 text-indigo-600" /> Stored data</p>
          <button onClick={clearCaches} className="w-full py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold">
            Clear offline prayer & mosque cache
          </button>
          <button onClick={deleteDeviceData} className="w-full py-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Delete this device's data
          </button>
          <p className="text-[10px] text-gray-400">
            Prayer times and mosque lists stay cached on-device so the app works offline.
          </p>
        </div>
      </div>
    </div>
  );
};
