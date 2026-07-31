import React, { useEffect, useState } from 'react';
import { Bell, Sunrise, Sun, Sunset, Moon, Volume2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  loadPrayerNotificationPrefs,
  savePrayerNotificationPrefs,
  PRAYER_KEYS,
  type PrayerNotificationPrefs,
  type PrayerKey,
} from '@/native/prayerNotificationPrefs';

const ICONS: Record<PrayerKey, React.ElementType> = {
  fajr: Sunrise,
  dhuhr: Sun,
  asr: Sun,
  maghrib: Sunset,
  isha: Moon,
};

const LABELS: Record<PrayerKey, string> = {
  fajr: 'Fajr',
  dhuhr: 'Zuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

export const PrayerNotificationToggles: React.FC = () => {
  const [prefs, setPrefs] = useState<PrayerNotificationPrefs>(() => loadPrayerNotificationPrefs());

  useEffect(() => {
    void savePrayerNotificationPrefs(prefs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs]);

  const toggle = (phase: 'adhan' | 'iqamah', key: PrayerKey, value: boolean) =>
    setPrefs((p) => ({ ...p, [phase]: { ...p[phase], [key]: value } }));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-gray-500">
        <span>Prayer</span>
        <span className="flex gap-6 pr-1">
          <span className="w-10 text-center">Adhan</span>
          <span className="w-10 text-center">Iqamah</span>
        </span>
      </div>

      {PRAYER_KEYS.map((key) => {
        const Icon = ICONS[key];
        return (
          <div key={key} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-gray-50 rounded-lg shrink-0">
                <Icon className="w-4 h-4 text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-700 truncate">{LABELS[key]}</span>
            </div>
            <div className="flex items-center gap-6 shrink-0">
              <div className="w-10 flex justify-center">
                <Switch
                  checked={prefs.adhan[key]}
                  onCheckedChange={(v) => toggle('adhan', key, v)}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
              <div className="w-10 flex justify-center">
                <Switch
                  checked={prefs.iqamah[key]}
                  onCheckedChange={(v) => toggle('iqamah', key, v)}
                  className="data-[state=checked]:bg-sky-500"
                />
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-violet-50 rounded-lg shrink-0">🌙</div>
          <div className="min-w-0">
            <span className="text-sm font-medium text-gray-700 block">Ramadan alerts</span>
            <p className="text-xs text-gray-500 truncate">Sahar end, Iftar and Tharaweeh</p>
          </div>
        </div>
        <Switch
          checked={prefs.ramadan}
          onCheckedChange={(v) => setPrefs((p) => ({ ...p, ramadan: v }))}
          className="data-[state=checked]:bg-violet-500 shrink-0 ml-2"
        />
      </div>

      <p className="text-[11px] text-gray-500 px-1 flex items-center gap-1">
        <Bell className="w-3 h-3" /> Applies to background alarms too — no need to keep the app open.
      </p>
      <p className="text-[11px] text-gray-400 px-1 flex items-center gap-1">
        <Volume2 className="w-3 h-3" /> Adhan sound and volume are set above.
      </p>
    </div>
  );
};
