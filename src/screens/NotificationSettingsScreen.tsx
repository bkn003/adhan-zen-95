import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, BellOff, Moon, Loader2, Megaphone, CloudDownload } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useLocations } from '@/hooks/useLocations';
import { loadQuietHours, saveQuietHours, type QuietHours } from '@/utils/quietHours';
import { isPushEnabled, setPushEnabled, pushSupported } from '@/native/pushRegistration';
import { syncYearAlarms, readYearAlarmStatus } from '@/native/yearAlarms';
import { readLocationSnapshot } from '@/storage/prayerStore';

interface Props { onBack: () => void }

export const NotificationSettingsScreen: React.FC<Props> = ({ onBack }) => {
  const { data: locations = [], isLoading } = useLocations();
  const [follows, setFollows] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [push, setPush] = useState(isPushEnabled());
  const [quiet, setQuiet] = useState<QuietHours>(loadQuietHours());

  const myMosque = localStorage.getItem('selectedLocationId') || undefined;
  const selectedMosqueName =
    locations.find((l: any) => l.id === myMosque)?.mosque_name ||
    readLocationSnapshot<any>()?.mosque_name ||
    '';
  const [yearBusy, setYearBusy] = useState(false);
  const [yearStatus, setYearStatus] = useState(readYearAlarmStatus());

  const downloadYear = async () => {
    if (!selectedMosqueName) return;
    setYearBusy(true);
    try {
      const res = await syncYearAlarms(selectedMosqueName, myMosque ?? null);
      setYearStatus({ ...res, mosqueName: selectedMosqueName });
      toast.success(`Saved ${res.storedDays} days of timings for offline alarms`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not download timings. Try again when online.');
    } finally {
      setYearBusy(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('mosque_follows').select('location_id, announcements');
      const map: Record<string, boolean> = {};
      (data ?? []).forEach((r: any) => { map[r.location_id] = r.announcements; });
      setFollows(map);
    })();
  }, []);

  const toggleFollow = async (locationId: string, on: boolean) => {
    setSaving(locationId);
    setFollows((p) => ({ ...p, [locationId]: on }));
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) {
      toast.error('Session not ready — try again in a moment');
      setSaving(null);
      return;
    }
    const { error } = await supabase
      .from('mosque_follows')
      .upsert({ user_id: userId, location_id: locationId, announcements: on } as never, {
        onConflict: 'user_id,location_id',
      });
    setSaving(null);
    if (error) {
      toast.error('Could not save preference');
      setFollows((p) => ({ ...p, [locationId]: !on }));
    }
  };

  const updateQuiet = (patch: Partial<QuietHours>) => {
    const next = { ...quiet, ...patch };
    setQuiet(next);
    saveQuietHours(next);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-white pb-24">
      <div className="sticky top-0 z-20 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl active:scale-95" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold flex items-center gap-2"><Bell className="w-4 h-4" /> Notifications</h1>
            <p className="text-[11px] opacity-85">Mosque announcements & quiet hours</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Master push switch */}
        <div className="rounded-2xl bg-white border border-emerald-100 p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-emerald-600" /> Mosque announcements
              </p>
              <p className="text-[11px] text-gray-500">
                Get pushes from mosques you follow, even when the app is closed.
              </p>
            </div>
            <Switch
              checked={push}
              onCheckedChange={async (v) => { setPush(v); await setPushEnabled(v); }}
              className="data-[state=checked]:bg-emerald-500 shrink-0"
            />
          </div>
          {!pushSupported() && (
            <p className="mt-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
              Push delivery while closed works in the installed Android/iOS app. On the web you'll still
              see in-app and local reminders.
            </p>
          )}
        </div>

        {/* Year of offline timings */}
        <div className="rounded-2xl bg-white border border-teal-100 p-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <CloudDownload className="w-4 h-4 text-teal-600" /> Download a year of timings
              </p>
              <p className="text-[11px] text-gray-500">
                Keeps Adhan and Jamaat alarms ringing for a year with no internet, even if the app is never opened.
              </p>
            </div>
            <button
              onClick={downloadYear}
              disabled={yearBusy || !selectedMosqueName}
              className="shrink-0 px-3 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold active:scale-95 disabled:opacity-50"
            >
              {yearBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Download'}
            </button>
          </div>
          {!selectedMosqueName && (
            <p className="mt-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
              Choose your mosque first in Settings, then download.
            </p>
          )}
          {yearStatus && (
            <p className="mt-2 text-[10px] text-gray-600 bg-teal-50 border border-teal-100 rounded-lg p-2">
              {yearStatus.storedDays} days saved for {yearStatus.mosqueName || 'your mosque'} · last synced{' '}
              {new Date(yearStatus.syncedAt).toLocaleString()}
              {yearStatus.native ? ` · ${yearStatus.armedAlarms} alarms armed` : ' · alarms ring in the installed Android app'}
            </p>
          )}
        </div>

        {/* Quiet hours */}
        <div className="rounded-2xl bg-white border border-indigo-100 p-3 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-indigo-600" /> Quiet hours
              </p>
              <p className="text-[11px] text-gray-500">Silence prayer reminders in this window.</p>
            </div>
            <Switch
              checked={quiet.enabled}
              onCheckedChange={(v) => updateQuiet({ enabled: v })}
              className="data-[state=checked]:bg-indigo-500 shrink-0"
            />
          </div>
          {quiet.enabled && (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] font-semibold text-gray-500">
                From
                <input
                  type="time"
                  value={quiet.start}
                  onChange={(e) => updateQuiet({ start: e.target.value })}
                  className="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-indigo-400"
                />
              </label>
              <label className="text-[11px] font-semibold text-gray-500">
                To
                <input
                  type="time"
                  value={quiet.end}
                  onChange={(e) => updateQuiet({ end: e.target.value })}
                  className="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-indigo-400"
                />
              </label>
            </div>
          )}
        </div>

        {/* Alarm loudness & snooze */}
        <div className="rounded-2xl bg-white border border-amber-100 p-3 shadow-sm space-y-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-amber-600" /> Adhan loudness &amp; snooze
            </p>
            <p className="text-[11px] text-gray-500">How loud the Adhan plays, and how long Snooze waits.</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => updateVolume(parseFloat(e.target.value))}
              className="flex-1 accent-amber-500"
              aria-label="Adhan volume"
            />
            <span className="text-xs font-bold text-gray-600 w-10 text-right">{Math.round(volume * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            {SNOOZE_CHOICES.map((m) => (
              <button
                key={m}
                onClick={() => updateSnooze(m)}
                className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  snooze === m
                    ? 'bg-amber-500 text-white border-transparent'
                    : 'bg-amber-50 text-amber-700 border-amber-100'
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>



        {/* Per-mosque toggles */}
        <div className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-2">Per-mosque announcements</h2>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-emerald-600" /></div>
          ) : (
            <div className="space-y-1.5">
              {locations.map((l) => {
                const on = !!follows[l.id];
                return (
                  <div key={l.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {l.mosque_name}
                        {l.id === myMosque && <span className="ml-1 text-[9px] text-emerald-600 font-bold">MY MOHALLA</span>}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">{l.district}</p>
                    </div>
                    {saving === l.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                    ) : (
                      <Switch
                        checked={on}
                        onCheckedChange={(v) => toggleFollow(l.id, v)}
                        className="data-[state=checked]:bg-emerald-500 shrink-0"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
            <BellOff className="w-3 h-3" /> Turning a mosque off stops its announcement pushes immediately.
          </p>
        </div>
      </div>
    </div>
  );
};
