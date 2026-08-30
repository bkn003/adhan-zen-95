import React, { useEffect, useState } from 'react';
import { Bell, Sunrise, Sun, Sunset, Moon, Volume2, Timer, Megaphone, CalendarClock, Send, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  loadPrayerNotificationPrefs,
  savePrayerNotificationPrefs,
  PRAYER_KEYS,
  type PrayerNotificationPrefs,
  type PrayerKey,
  type PeriodPrefs,
} from '@/native/prayerNotificationPrefs';
import { sendTestNotification, type TestNotificationResult } from '@/utils/testNotification';

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

const PERIODS: { key: keyof PeriodPrefs; label: string; hint: string; icon: React.ElementType; color: string }[] = [
  { key: 'preReminder', label: 'Before prayer', hint: 'Heads-up a few minutes before adhan', icon: Timer, color: 'amber' },
  { key: 'adhan', label: 'At adhan', hint: 'Alert at the adhan time', icon: Bell, color: 'emerald' },
  { key: 'iqamah', label: 'At jamaat (iqamah)', hint: 'Alert when jamaat starts', icon: Volume2, color: 'sky' },
  { key: 'weeklyChange', label: 'Weekly time changes', hint: 'When your mosque updates a date-range schedule', icon: CalendarClock, color: 'indigo' },
  { key: 'announcements', label: 'Mosque announcements', hint: 'Events and notices from mosques you follow', icon: Megaphone, color: 'violet' },
];

export const PrayerNotificationToggles: React.FC = () => {
  const [prefs, setPrefs] = useState<PrayerNotificationPrefs>(() => loadPrayerNotificationPrefs());
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestNotificationResult | null>(null);

  useEffect(() => {
    void savePrayerNotificationPrefs(prefs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs]);

  const toggle = (phase: 'adhan' | 'iqamah', key: PrayerKey, value: boolean) =>
    setPrefs((p) => ({ ...p, [phase]: { ...p[phase], [key]: value } }));

  const togglePeriod = (key: keyof PeriodPrefs, value: boolean) =>
    setPrefs((p) => ({ ...p, periods: { ...p.periods, [key]: value } }));

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    const r = await sendTestNotification(
      'Test prayer reminder',
      'If you can see this, prayer reminders will reach you the same way.',
    );
    setResult(r);
    setTesting(false);
  };

  return (
    <div className="space-y-4">
      {/* Per-period toggles */}
      <div className="space-y-2">
        <p className="px-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Notification periods</p>
        {PERIODS.map(({ key, label, hint, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-gray-50 rounded-lg shrink-0">
                <Icon className="w-4 h-4 text-gray-600" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-medium text-gray-700 block truncate">{label}</span>
                <p className="text-[11px] text-gray-500 truncate">{hint}</p>
              </div>
            </div>
            <Switch
              checked={prefs.periods[key]}
              onCheckedChange={(v) => togglePeriod(key, v)}
              className="data-[state=checked]:bg-emerald-500 shrink-0"
            />
          </div>
        ))}

        {prefs.periods.preReminder && (
          <div className="p-3 bg-white rounded-xl border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Remind me before</span>
              <span className="text-sm font-bold text-amber-600">{prefs.preMinutes} min</span>
            </div>
            <input
              type="range"
              min={5}
              max={45}
              step={5}
              value={prefs.preMinutes}
              onChange={(e) => setLead(Number(e.target.value))}
              className="mt-2 w-full accent-amber-500"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[5, 10, 15, 20, 30, 45].map((m) => (
                <button
                  key={m}
                  onClick={() => setLead(m)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                    prefs.preMinutes === m
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              Saved — you'll be alerted {prefs.preMinutes} minutes before each adhan.
            </p>
          </div>
        )}

      </div>

      {/* Per-prayer toggles */}
      <div className="space-y-2">
        <p className="px-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Per prayer</p>
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
                    disabled={!prefs.periods.adhan}
                    onCheckedChange={(v) => toggle('adhan', key, v)}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
                <div className="w-10 flex justify-center">
                  <Switch
                    checked={prefs.iqamah[key]}
                    disabled={!prefs.periods.iqamah}
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
      </div>

      {/* End-to-end test */}
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 space-y-2">
        <p className="text-sm font-bold text-gray-800">Verify reminders end to end</p>
        <p className="text-[11px] text-gray-600">
          Sends one real notification through the same channel used for prayer alerts — works in the
          installed Android app and in the browser/PWA.
        </p>
        <button
          onClick={runTest}
          disabled={testing}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60"
        >
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send test notification
        </button>
        {result && (
          <p
            className={`text-[11px] flex items-start gap-1 rounded-lg p-2 ${
              result.ok ? 'bg-white text-emerald-700' : 'bg-amber-50 text-amber-800'
            }`}
          >
            {result.ok ? (
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            )}
            <span>{result.message}</span>
          </p>
        )}
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
