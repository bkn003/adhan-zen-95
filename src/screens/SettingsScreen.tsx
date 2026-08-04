import React, { useState, useEffect } from 'react';
import { MapPin, Volume2, Clock, Moon, Bell, ChevronRight, Settings as SettingsIcon, VolumeX, Sunrise, Sun, Sunset, Home, Globe } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { LANGUAGE_LABELS } from '@/i18n/translations';
import type { Language } from '@/i18n/translations';
import { LocationSelector } from '@/components/LocationSelector';
import { useLocations } from '@/hooks/useLocations';
import type { Location } from '@/types/prayer.types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useNotifications } from '@/hooks/useNotifications';
import { Capacitor } from '@capacitor/core';
import { AdhanSoundSelector } from '@/components/AdhanSoundSelector';
import { VibrationSelector } from '@/components/VibrationSelector';
import { SyncStatusCard } from '@/components/SyncStatusCard';
import { PrayerNotificationToggles } from '@/components/PrayerNotificationToggles';
import { Link } from 'react-router-dom';

const SettingsCard = ({
  children,
  title,
  icon: Icon,
  gradient = 'from-gray-50 to-white'
}: {
  children: React.ReactNode;
  title: string;
  icon?: React.ElementType;
  gradient?: string;
}) => (
  <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-4 border border-gray-100/50 shadow-sm`}>
    <div className="flex items-center gap-2 mb-3">
      {Icon && (
        <div className="p-2 bg-white rounded-xl shadow-sm">
          <Icon className="w-4 h-4 text-gray-600" />
        </div>
      )}
      <h3 className="text-sm font-bold text-gray-800">{title}</h3>
    </div>
    {children}
  </div>
);

const ToggleItem = ({
  icon: Icon,
  label,
  sublabel,
  checked,
  onChange,
  disabled = false,
}: {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <div className="p-1.5 bg-gray-50 rounded-lg shrink-0">
        <Icon className="w-4 h-4 text-gray-600" />
      </div>
      <div className="min-w-0">
        <span className="text-sm font-medium text-gray-700 block truncate">{label}</span>
        {sublabel && <p className="text-xs text-gray-500 truncate">{sublabel}</p>}
      </div>
    </div>
    <Switch
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      className="data-[state=checked]:bg-emerald-500 shrink-0 ml-2"
    />
  </div>
);

const PrayerDndToggle = ({
  prayerName,
  icon: Icon,
  checked,
  onChange,
}: {
  prayerName: string;
  icon: React.ElementType;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-100">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-gray-500" />
      <span className="text-sm font-medium text-gray-700">{prayerName}</span>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-violet-500" />
  </div>
);

export const SettingsScreen = () => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [mohallaLocation, setMohallaLocation] = useState<Location | null>(null);
  const [adhanVolume, setAdhanVolume] = useState(50);
  const [prayerAlarmEnabled, setPrayerAlarmEnabled] = useState(false);

  // DND Settings
  const [dndEnabled, setDndEnabled] = useState(true);
  const [dndBeforeIqamah, setDndBeforeIqamah] = useState(5);
  const [dndAfterIqamah, setDndAfterIqamah] = useState(15);
  const [dndPerPrayer, setDndPerPrayer] = useState({
    fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true,
  });
  const [dndPermissionGranted, setDndPermissionGranted] = useState(true);
  const [showDndPermissionPrompt, setShowDndPermissionPrompt] = useState(false);

  const { data: locations } = useLocations();
  const { permission, supported, enabled: notificationsEnabled, enableNotifications, disableNotifications } = useNotifications();

  const isNative = Capacitor.isNativePlatform();
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    const persistedLocationId = localStorage.getItem('selectedLocationId');
    if (persistedLocationId && locations) {
      const location = locations.find(loc => loc.id === persistedLocationId);
      if (location) setSelectedLocation(location);
    }

    const mohallaId = localStorage.getItem('myMohallaId');
    if (mohallaId && locations) {
      const mohalla = locations.find(loc => loc.id === mohallaId);
      if (mohalla) setMohallaLocation(mohalla);
    }

    const savedAlarm = localStorage.getItem('prayerAlarmEnabled');
    if (savedAlarm !== null) setPrayerAlarmEnabled(savedAlarm === 'true');

    const savedAdhanVolume = localStorage.getItem('adhanVolume');
    if (savedAdhanVolume) setAdhanVolume(parseInt(savedAdhanVolume));

    const savedDndEnabled = localStorage.getItem('dndEnabled');
    if (savedDndEnabled !== null) setDndEnabled(savedDndEnabled === 'true');

    const savedDndBefore = localStorage.getItem('dndBeforeIqamah');
    if (savedDndBefore) setDndBeforeIqamah(parseInt(savedDndBefore));

    const savedDndAfter = localStorage.getItem('dndAfterIqamah');
    if (savedDndAfter) setDndAfterIqamah(parseInt(savedDndAfter));

    const savedDndPerPrayer = localStorage.getItem('dndPerPrayer');
    if (savedDndPerPrayer) {
      try { setDndPerPrayer(JSON.parse(savedDndPerPrayer)); } catch (e) { }
    }

    const checkDndPermissionStatus = async () => {
      if (isNative) {
        try {
          const { checkDndPermission } = await import('@/native/dndService');
          const hasPermission = await checkDndPermission();
          setDndPermissionGranted(hasPermission);
          if (!hasPermission && savedDndEnabled === 'true') {
            const skipPrompt = localStorage.getItem('dnd_permission_prompt_skipped');
            if (!skipPrompt) setShowDndPermissionPrompt(true);
          }
        } catch (e) { console.error('Failed to check DND permission:', e); }
      }
    };
    checkDndPermissionStatus();
  }, [locations, isNative]);

  const handleLocationChange = (location: Location) => {
    setSelectedLocation(location);
    localStorage.setItem('selectedLocationId', location.id);
  };

  const handleVolumeChange = (value: number[]) => {
    setAdhanVolume(value[0]);
    localStorage.setItem('adhanVolume', value[0].toString());
    if (isNative) {
      import('@/native/dndService').then(({ setAdhanVolume }) => { setAdhanVolume(value[0]); });
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) await enableNotifications();
    else disableNotifications();
  };

  const handleDndEnabledToggle = async (enabled: boolean) => {
    setDndEnabled(enabled);
    localStorage.setItem('dndEnabled', enabled.toString());
    await syncDndToNative(enabled, dndPerPrayer, dndBeforeIqamah, dndAfterIqamah);
  };

  const handleDndBeforeChange = async (value: number[]) => {
    setDndBeforeIqamah(value[0]);
    localStorage.setItem('dndBeforeIqamah', value[0].toString());
    await syncDndToNative(dndEnabled, dndPerPrayer, value[0], dndAfterIqamah);
  };

  const handleDndAfterChange = async (value: number[]) => {
    setDndAfterIqamah(value[0]);
    localStorage.setItem('dndAfterIqamah', value[0].toString());
    await syncDndToNative(dndEnabled, dndPerPrayer, dndBeforeIqamah, value[0]);
  };

  const handlePrayerDndToggle = async (prayer: keyof typeof dndPerPrayer, enabled: boolean) => {
    const updated = { ...dndPerPrayer, [prayer]: enabled };
    setDndPerPrayer(updated);
    localStorage.setItem('dndPerPrayer', JSON.stringify(updated));
    await syncDndToNative(dndEnabled, updated, dndBeforeIqamah, dndAfterIqamah);
  };

  const syncDndToNative = async (enabled: boolean, perPrayer: typeof dndPerPrayer, beforeMin: number, afterMin: number) => {
    if (!isNative) return;
    try {
      const { Capacitor } = await import('@capacitor/core');
      const { registerPlugin } = Capacitor;
      const AdhanNative = registerPlugin('AdhanNative');
      const enabledPrayers: string[] = [];
      if (enabled) {
        Object.entries(perPrayer).forEach(([prayer, isEnabled]) => {
          if (isEnabled) enabledPrayers.push(prayer);
        });
      }
      await (AdhanNative as any).saveDndSettings({ enabled, beforeMinutes: beforeMin, afterMinutes: afterMin, enabledPrayers });
    } catch (e) { console.error('Failed to sync DND:', e); }
  };

  useEffect(() => {
    if (isNative) {
      const timer = setTimeout(() => { syncDndToNative(dndEnabled, dndPerPrayer, dndBeforeIqamah, dndAfterIqamah); }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isNative]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 p-3 pb-28 space-y-3">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-center shadow-xl shadow-emerald-500/20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl mx-auto mb-2 flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">{t('settings')}</h2>
        </div>
      </div>

      {/* Language Selector */}
      <SettingsCard title={t('language')} icon={Globe} gradient="from-violet-50/50 to-white">
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([code, label]) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${language === code
                ? 'bg-violet-500 text-white shadow-md shadow-violet-500/25'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </SettingsCard>

      {/* Location Settings */}
      <SettingsCard title={t('location')} icon={MapPin} gradient="from-blue-50/50 to-white">
        <p className="text-xs text-gray-500 mb-2">
          The mosque you are currently viewing — its timings are shown on the home screen and used for adhan alarms.
        </p>
        <LocationSelector selectedLocation={selectedLocation} onLocationChange={handleLocationChange} />
      </SettingsCard>

      {/* My Mohalla */}
      <SettingsCard title={t('myMohalla')} icon={Home} gradient="from-emerald-50/50 to-white">
        <div className="space-y-2">
          <p className="text-xs text-gray-500">{t('setHomeMosque')}</p>
          <p className="text-xs text-gray-400">
            Your home mosque. It stays fixed even when you switch the viewing location above, and you get a
            notification whenever its prayer timings change.
          </p>
          <LocationSelector
            selectedLocation={mohallaLocation}
            onLocationChange={(location: Location) => {
              setMohallaLocation(location);
              localStorage.setItem('myMohallaId', location.id);
            }}
          />
          {mohallaLocation && (
            <div className="p-2 bg-emerald-50 rounded-xl">
              <p className="text-xs text-emerald-700 font-medium">✅ {mohallaLocation.mosque_name}</p>
            </div>
          )}
        </div>
      </SettingsCard>


      {/* DND Permission Prompt */}
      {showDndPermissionPrompt && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-xl"><VolumeX className="w-5 h-5 text-amber-600" /></div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-800">DND Permission Required</h3>
              <p className="text-xs text-amber-700 mt-1">Auto-silence during prayer requires DND permission.</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={async () => {
                    const { requestDndPermission } = await import('@/native/dndService');
                    await requestDndPermission();
                    setShowDndPermissionPrompt(false);
                  }}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold"
                >Enable Now</button>
                <button
                  onClick={() => {
                    localStorage.setItem('dnd_permission_prompt_skipped', 'true');
                    setShowDndPermissionPrompt(false);
                    setDndEnabled(false);
                    localStorage.setItem('dndEnabled', 'false');
                  }}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
                >Skip</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DND Settings - Only on Native */}
      {isNative && (
        <SettingsCard title={t('dndMode')} icon={VolumeX} gradient="from-violet-50/50 to-white">
          <div className="space-y-3">
            {!dndPermissionGranted && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600 font-medium">⚠️ DND permission not granted.</p>
              </div>
            )}
            <ToggleItem
              icon={VolumeX}
              label={t('enableAutoDnd')}
              sublabel={dndPermissionGranted ? "Silence phone during prayer" : "Permission required"}
              checked={dndEnabled}
              onChange={async (enabled) => {
                if (enabled && !dndPermissionGranted) {
                  const { requestDndPermission, checkDndPermission } = await import('@/native/dndService');
                  await requestDndPermission();
                  const hasPermission = await checkDndPermission();
                  setDndPermissionGranted(hasPermission);
                  if (!hasPermission) return;
                }
                handleDndEnabledToggle(enabled);
              }}
            />
            {dndEnabled && (
              <>
                <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">{t('activateDndBefore')}</span>
                      <span className="font-bold text-violet-600">{dndBeforeIqamah} min</span>
                    </div>
                    <Slider value={[dndBeforeIqamah]} onValueChange={handleDndBeforeChange} max={15} min={0} step={1} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">{t('deactivateDndAfter')}</span>
                      <span className="font-bold text-violet-600">{dndAfterIqamah} min</span>
                    </div>
                    <Slider value={[dndAfterIqamah]} onValueChange={handleDndAfterChange} max={30} min={5} step={1} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium px-1">{t('enableDndPerPrayer')}</p>
                  <PrayerDndToggle prayerName={t('fajr')} icon={Sunrise} checked={dndPerPrayer.fajr} onChange={(v) => handlePrayerDndToggle('fajr', v)} />
                  <PrayerDndToggle prayerName={t('dhuhr')} icon={Sun} checked={dndPerPrayer.dhuhr} onChange={(v) => handlePrayerDndToggle('dhuhr', v)} />
                  <PrayerDndToggle prayerName={t('asr')} icon={Sun} checked={dndPerPrayer.asr} onChange={(v) => handlePrayerDndToggle('asr', v)} />
                  <PrayerDndToggle prayerName={t('maghrib')} icon={Sunset} checked={dndPerPrayer.maghrib} onChange={(v) => handlePrayerDndToggle('maghrib', v)} />
                  <PrayerDndToggle prayerName={t('isha')} icon={Moon} checked={dndPerPrayer.isha} onChange={(v) => handlePrayerDndToggle('isha', v)} />
                </div>
              </>
            )}
          </div>
        </SettingsCard>
      )}

      {/* Notifications */}
      <SettingsCard title={t('adhanNotifications')} icon={Bell} gradient="from-rose-50/50 to-white">
        <div className="space-y-3">
          {!supported && (
            <div className="p-2 bg-red-50 rounded-xl text-center">
              <p className="text-xs text-red-600">Notifications not supported</p>
            </div>
          )}
          <ToggleItem
            icon={Bell}
            label={t('enableNotifications')}
            sublabel={permission === 'denied' ? 'Permission denied' : ''}
            checked={notificationsEnabled}
            onChange={handleNotificationToggle}
            disabled={!supported || permission === 'denied'}
          />
          <ToggleItem
            icon={Volume2}
            label={t('fullScreenAlarm')}
            checked={prayerAlarmEnabled}
            onChange={(enabled) => {
              setPrayerAlarmEnabled(enabled);
              localStorage.setItem('prayerAlarmEnabled', enabled.toString());
              if (enabled) enableNotifications();
            }}
            disabled={!supported}
          />
          {isNative && notificationsEnabled && (
            <div className="p-3 bg-white rounded-xl border border-gray-100">
              <AdhanSoundSelector />
            </div>
          )}
          {isNative && <VibrationSelector />}
          <div className="p-3 bg-white rounded-xl border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Volume</span>
              <span className="text-sm font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{adhanVolume}%</span>
            </div>
            <Slider value={[adhanVolume]} onValueChange={handleVolumeChange} max={100} min={0} step={5} />
          </div>
        </div>
      </SettingsCard>

      {/* Mosque Admin */}
      <SettingsCard title={t('mosqueAdmin')} icon={SettingsIcon} gradient="from-gray-50/50 to-white">
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Login to manage your mosque's prayer times and info.</p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-admin'))}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          >
            <SettingsIcon className="w-4 h-4" />
            {t('openAdminPanel')}
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-super-admin'))}
            className="w-full py-2 px-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-medium flex items-center justify-center gap-2"
          >
            {t('superAdmin')}
          </button>
        </div>
      </SettingsCard>

      {/* Tools */}
      <SettingsCard title="Tools" icon={SettingsIcon} gradient="from-amber-50/50 to-white">
        <div className="space-y-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-tasbeeh'))}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-semibold flex items-center justify-between"
          >
            <span className="flex items-center gap-2">📿 Tasbeeh Counter</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-quran'))}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-xl text-sm font-semibold flex items-center justify-between"
          >
            <span className="flex items-center gap-2">📖 Quran Reader</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-compare'))}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-sky-600 text-white rounded-xl text-sm font-semibold flex items-center justify-between"
          >
            <span className="flex items-center gap-2">🔀 Compare Mosque Times</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-zakat'))}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold flex items-center justify-between"
          >
            <span className="flex items-center gap-2">💰 Zakat Calculator</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <Link
            to="/widget"
            className="w-full py-2.5 px-3 bg-slate-900 text-white rounded-xl text-sm font-semibold flex items-center justify-between"
          >
            <span className="flex items-center gap-2">📲 Open Next-Prayer Widget</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-notifications'))}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold flex items-center justify-between"
          >
            <span className="flex items-center gap-2">📣 Mosque Announcements &amp; Quiet Hours</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-privacy'))}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-slate-800 to-slate-600 text-white rounded-xl text-sm font-semibold flex items-center justify-between"
          >
            <span className="flex items-center gap-2">🛡️ Privacy &amp; Data Controls</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <p className="text-[11px] text-gray-500 px-1">
            Tip: Install the app, then long-press its icon for quick Widget / Qibla / Tracker shortcuts.
          </p>
        </div>
      </SettingsCard>

      {/* Per-prayer notification toggles */}
      <SettingsCard title="Per-prayer alerts" icon={Bell} gradient="from-emerald-50/50 to-white">
        <PrayerNotificationToggles />
      </SettingsCard>

      {/* Background sync */}
      <SettingsCard title="Background sync" icon={Clock} gradient="from-blue-50/50 to-white">
        <SyncStatusCard />
      </SettingsCard>

      {/* Smart Notifications */}
      <SettingsCard title="Smart Reminders" icon={Bell} gradient="from-sky-50/50 to-white">
        <WeatherReminderToggle />
      </SettingsCard>



      {/* App Version */}
      <div className="text-center py-3">
        <p className="text-xs text-gray-400">Adhan Zen v2.1</p>
        <p className="text-xs text-gray-400">Made with ❤️ for the Ummah</p>
      </div>
    </div>
  );
};

const WeatherReminderToggle: React.FC = () => {
  const [on, setOn] = useState(() => localStorage.getItem('weatherReminders') === 'true');
  const [weather, setWeather] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const refresh = React.useCallback(async () => {
    setChecking(true);
    try {
      const raw = localStorage.getItem('selectedLocationData');
      const loc = raw ? JSON.parse(raw) : null;
      if (!loc?.latitude || !loc?.longitude) {
        setWeather('Select a mosque to enable weather tips');
        setTip(null);
        return;
      }
      const snap = await getWeather(Number(loc.latitude), Number(loc.longitude));
      if (!snap) {
        setWeather('Weather service unreachable');
        setTip(null);
        return;
      }
      setWeather(describeWeather(snap));
      setTip(contextualTip(snap, 'Asr'));
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { if (on) void refresh(); }, [on, refresh]);

  const testReminder = async () => {
    if (typeof Notification === 'undefined') return;
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
    new Notification('Asr soon', {
      body: `Prayer in 15 minutes${weather ? `\n${weather}` : ''}${tip ? `\n${tip}` : ''}`,
      icon: '/app-icon-192.png',
      tag: 'weather-test',
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="p-1.5 bg-sky-50 rounded-lg shrink-0">🌦️</div>
          <div className="min-w-0">
            <span className="text-sm font-medium text-gray-700 block truncate">
              Weather-aware reminders
            </span>
            <p className="text-xs text-gray-500">
              15-min before prayer + weather tip (rain / heat / cold).
            </p>
          </div>
        </div>
        <Switch
          checked={on}
          onCheckedChange={(v) => {
            setOn(v);
            localStorage.setItem('weatherReminders', String(v));
          }}
          className="data-[state=checked]:bg-sky-500 shrink-0 ml-2"
        />
      </div>

      {on && (
        <div className="p-3 bg-sky-50/70 rounded-xl border border-sky-100 space-y-2">
          <p className="text-xs font-semibold text-sky-800">
            {checking ? 'Checking weather…' : weather ?? 'No weather data yet'}
          </p>
          {tip && <p className="text-xs text-sky-700">{tip}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => void refresh()}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-sky-200 text-sky-700"
            >
              Refresh
            </button>
            <button
              onClick={() => void testReminder()}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-sky-500 text-white"
            >
              Send test reminder
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


