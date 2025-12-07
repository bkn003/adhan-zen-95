import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Volume2, Clock, Moon, Bell, ChevronRight, Settings as SettingsIcon, RefreshCw, VolumeX, Sunrise, Sun, Sunset } from 'lucide-react';
import { tamilText } from '@/utils/tamilText';
import { LocationSelector } from '@/components/LocationSelector';
import { HijriAdjustment } from '@/components/HijriAdjustment';
import { useLocations } from '@/hooks/useLocations';
import type { Location } from '@/types/prayer.types';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useNotifications } from '@/hooks/useNotifications';
import { Capacitor } from '@capacitor/core';

// Modern Settings Card Component
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

// Modern Toggle Item Component
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

// Prayer DND Toggle Item
const PrayerDndToggle = ({
  prayerName,
  tamilName,
  icon: Icon,
  checked,
  onChange,
}: {
  prayerName: string;
  tamilName: string;
  icon: React.ElementType;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-100">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-gray-500" />
      <div>
        <span className="text-sm font-medium text-gray-700">{prayerName}</span>
        <span className="text-xs text-gray-400 ml-1">{tamilName}</span>
      </div>
    </div>
    <Switch
      checked={checked}
      onCheckedChange={onChange}
      className="data-[state=checked]:bg-violet-500"
    />
  </div>
);

export const SettingsScreen = () => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isRamadanMode, setIsRamadanMode] = useState(false);
  const [isSaharEndEnabled, setIsSaharEndEnabled] = useState(true);
  const [adhanVolume, setAdhanVolume] = useState(50);

  // DND Settings
  const [dndEnabled, setDndEnabled] = useState(true);
  const [dndBeforeIqamah, setDndBeforeIqamah] = useState(5);
  const [dndAfterIqamah, setDndAfterIqamah] = useState(15);
  const [dndPerPrayer, setDndPerPrayer] = useState({
    fajr: true,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
  });

  const { data: locations } = useLocations();
  const {
    permission,
    supported,
    enabled: notificationsEnabled,
    enableNotifications,
    disableNotifications
  } = useNotifications();

  const isNative = Capacitor.isNativePlatform();

  // Load persisted settings
  useEffect(() => {
    const persistedLocationId = localStorage.getItem('selectedLocationId');
    if (persistedLocationId && locations) {
      const location = locations.find(loc => loc.id === persistedLocationId);
      if (location) setSelectedLocation(location);
    }

    const savedDate = sessionStorage.getItem('selectedDate');
    if (savedDate) setSelectedDate(new Date(savedDate));

    const savedRamadanMode = localStorage.getItem('isRamadan');
    if (savedRamadanMode !== null) setIsRamadanMode(savedRamadanMode === 'true');

    const savedSaharEnd = localStorage.getItem('showSahar');
    if (savedSaharEnd !== null) setIsSaharEndEnabled(savedSaharEnd === 'true');

    const savedAdhanVolume = localStorage.getItem('adhanVolume');
    if (savedAdhanVolume) setAdhanVolume(parseInt(savedAdhanVolume));

    // Load DND settings
    const savedDndEnabled = localStorage.getItem('dndEnabled');
    if (savedDndEnabled !== null) setDndEnabled(savedDndEnabled === 'true');

    const savedDndBefore = localStorage.getItem('dndBeforeIqamah');
    if (savedDndBefore) setDndBeforeIqamah(parseInt(savedDndBefore));

    const savedDndAfter = localStorage.getItem('dndAfterIqamah');
    if (savedDndAfter) setDndAfterIqamah(parseInt(savedDndAfter));

    const savedDndPerPrayer = localStorage.getItem('dndPerPrayer');
    if (savedDndPerPrayer) {
      try {
        setDndPerPrayer(JSON.parse(savedDndPerPrayer));
      } catch (e) { }
    }
  }, [locations]);

  const handleLocationChange = (location: Location) => {
    setSelectedLocation(location);
    localStorage.setItem('selectedLocationId', location.id);
  };

  const handleRamadanToggle = (enabled: boolean) => {
    setIsRamadanMode(enabled);
    localStorage.setItem('isRamadan', enabled.toString());
    localStorage.setItem('autoRamadanOverride', 'true');
  };

  const handleSaharEndToggle = (enabled: boolean) => {
    setIsSaharEndEnabled(enabled);
    localStorage.setItem('showSahar', enabled.toString());
  };

  const handleVolumeChange = (value: number[]) => {
    setAdhanVolume(value[0]);
    localStorage.setItem('adhanVolume', value[0].toString());
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      await enableNotifications();
    } else {
      disableNotifications();
    }
  };

  const handleResetAutoRamadan = () => {
    localStorage.removeItem('autoRamadanOverride');
    localStorage.removeItem('isRamadan');
    setIsRamadanMode(false);
  };

  const handleDndEnabledToggle = (enabled: boolean) => {
    setDndEnabled(enabled);
    localStorage.setItem('dndEnabled', enabled.toString());
  };

  const handleDndBeforeChange = (value: number[]) => {
    setDndBeforeIqamah(value[0]);
    localStorage.setItem('dndBeforeIqamah', value[0].toString());
  };

  const handleDndAfterChange = (value: number[]) => {
    setDndAfterIqamah(value[0]);
    localStorage.setItem('dndAfterIqamah', value[0].toString());
  };

  const handlePrayerDndToggle = (prayer: keyof typeof dndPerPrayer, enabled: boolean) => {
    const updated = { ...dndPerPrayer, [prayer]: enabled };
    setDndPerPrayer(updated);
    localStorage.setItem('dndPerPrayer', JSON.stringify(updated));
  };

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
          <h2 className="text-xl font-bold text-white">
            {tamilText.general.settings.english}
          </h2>
          <p className="text-white/70 text-xs">
            {tamilText.general.settings.tamil}
          </p>
        </div>
      </div>

      {/* Location Settings */}
      <SettingsCard title="Location" icon={MapPin} gradient="from-blue-50/50 to-white">
        <LocationSelector selectedLocation={selectedLocation} onLocationChange={handleLocationChange} />
      </SettingsCard>

      {/* Date Selection */}
      <SettingsCard title="Date Selection" icon={Calendar} gradient="from-amber-50/50 to-white">
        <div className="space-y-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-between text-left font-normal rounded-xl h-11 border-gray-200",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                </span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={date => {
                  setSelectedDate(date);
                  if (date) sessionStorage.setItem('selectedDate', date.toISOString());
                }}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                const today = new Date();
                setSelectedDate(today);
                sessionStorage.setItem('selectedDate', today.toISOString());
              }}
              className="py-2.5 px-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold active:scale-95"
            >
              Today
            </button>
            <button
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setSelectedDate(tomorrow);
                sessionStorage.setItem('selectedDate', tomorrow.toISOString());
              }}
              className="py-2.5 px-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold active:scale-95"
            >
              Tomorrow
            </button>
          </div>
        </div>
      </SettingsCard>

      {/* DND Settings - Only on Native */}
      {isNative && (
        <SettingsCard title="Do Not Disturb (DND)" icon={VolumeX} gradient="from-violet-50/50 to-white">
          <div className="space-y-3">
            <ToggleItem
              icon={VolumeX}
              label="Enable Auto DND"
              sublabel="Silence phone during prayer"
              checked={dndEnabled}
              onChange={handleDndEnabledToggle}
            />

            {dndEnabled && (
              <>
                {/* Time Adjustments */}
                <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Activate DND before Iqamah</span>
                      <span className="font-bold text-violet-600">{dndBeforeIqamah} min</span>
                    </div>
                    <Slider
                      value={[dndBeforeIqamah]}
                      onValueChange={handleDndBeforeChange}
                      max={15}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Deactivate DND after Iqamah</span>
                      <span className="font-bold text-violet-600">{dndAfterIqamah} min</span>
                    </div>
                    <Slider
                      value={[dndAfterIqamah]}
                      onValueChange={handleDndAfterChange}
                      max={30}
                      min={5}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Per-Prayer Toggles */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium px-1">Enable DND for each prayer:</p>
                  <PrayerDndToggle
                    prayerName="Fajr"
                    tamilName="ஃபஜ்ர்"
                    icon={Sunrise}
                    checked={dndPerPrayer.fajr}
                    onChange={(v) => handlePrayerDndToggle('fajr', v)}
                  />
                  <PrayerDndToggle
                    prayerName="Dhuhr"
                    tamilName="லுஹர்"
                    icon={Sun}
                    checked={dndPerPrayer.dhuhr}
                    onChange={(v) => handlePrayerDndToggle('dhuhr', v)}
                  />
                  <PrayerDndToggle
                    prayerName="Asr"
                    tamilName="அஸர்"
                    icon={Sun}
                    checked={dndPerPrayer.asr}
                    onChange={(v) => handlePrayerDndToggle('asr', v)}
                  />
                  <PrayerDndToggle
                    prayerName="Maghrib"
                    tamilName="மஃரிப்"
                    icon={Sunset}
                    checked={dndPerPrayer.maghrib}
                    onChange={(v) => handlePrayerDndToggle('maghrib', v)}
                  />
                  <PrayerDndToggle
                    prayerName="Isha"
                    tamilName="இஷா"
                    icon={Moon}
                    checked={dndPerPrayer.isha}
                    onChange={(v) => handlePrayerDndToggle('isha', v)}
                  />
                </div>
              </>
            )}
          </div>
        </SettingsCard>
      )}

      {/* Prayer Settings */}
      <SettingsCard title="Prayer Settings" icon={Moon} gradient="from-purple-50/50 to-white">
        <div className="space-y-2">
          <ToggleItem
            icon={Moon}
            label="Ramadan Mode"
            sublabel="ரமலான் நேரங்கள்"
            checked={isRamadanMode}
            onChange={handleRamadanToggle}
          />

          {isRamadanMode && (
            <ToggleItem
              icon={Clock}
              label="Sahar End Time"
              sublabel="சஹர் முடிவு நேரம்"
              checked={isSaharEndEnabled}
              onChange={handleSaharEndToggle}
            />
          )}

          <button
            onClick={handleResetAutoRamadan}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium active:scale-98"
          >
            <RefreshCw className="w-4 h-4" />
            Reset to Auto-detect
          </button>
        </div>
      </SettingsCard>

      {/* Hijri Date Adjustment */}
      <SettingsCard title="Hijri Date Adjustment" icon={Calendar} gradient="from-teal-50/50 to-white">
        <HijriAdjustment />
        <p className="text-xs text-gray-500 mt-2 text-center">
          Adjust to match local moon sighting
        </p>
      </SettingsCard>

      {/* Notifications */}
      <SettingsCard title="Adhan Notifications" icon={Bell} gradient="from-rose-50/50 to-white">
        <div className="space-y-3">
          {!supported && (
            <div className="p-2 bg-red-50 rounded-xl text-center">
              <p className="text-xs text-red-600">Notifications not supported</p>
            </div>
          )}

          <ToggleItem
            icon={Bell}
            label="Enable Notifications"
            sublabel={permission === 'denied' ? 'Permission denied' : 'Play adhan at prayer times'}
            checked={notificationsEnabled}
            onChange={handleNotificationToggle}
            disabled={!supported || permission === 'denied'}
          />

          <div className="p-3 bg-white rounded-xl border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Volume</span>
              <span className="text-sm font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                {adhanVolume}%
              </span>
            </div>
            <Slider
              value={[adhanVolume]}
              onValueChange={handleVolumeChange}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
          </div>
        </div>
      </SettingsCard>

      {/* App Version */}
      <div className="text-center py-3">
        <p className="text-xs text-gray-400">Adhan Zen v2.1</p>
        <p className="text-xs text-gray-400">Made with ❤️ for the Ummah</p>
      </div>
    </div>
  );
};