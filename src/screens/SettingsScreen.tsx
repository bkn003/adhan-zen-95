import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Palette, Volume2, Clock } from 'lucide-react';
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
export const SettingsScreen = () => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isRamadanMode, setIsRamadanMode] = useState(false);
  const [isSaharEndEnabled, setIsSaharEndEnabled] = useState(true);
  const [isAdhanEnabled, setIsAdhanEnabled] = useState(true);
  const [adhanVolume, setAdhanVolume] = useState(50);
  const {
    data: locations
  } = useLocations();
  const {
    permission,
    supported,
    enabled: notificationsEnabled,
    enableNotifications,
    disableNotifications
  } = useNotifications();

  // Load persisted settings
  useEffect(() => {
    const persistedLocationId = localStorage.getItem('selectedLocationId');
    if (persistedLocationId && locations) {
      const location = locations.find(loc => loc.id === persistedLocationId);
      if (location) {
        setSelectedLocation(location);
      }
    }
    const savedDate = sessionStorage.getItem('selectedDate');
    if (savedDate) {
      setSelectedDate(new Date(savedDate));
    }
    const savedRamadanMode = localStorage.getItem('isRamadan');
    if (savedRamadanMode !== null) {
      setIsRamadanMode(savedRamadanMode === 'true');
    }
    const savedSaharEnd = localStorage.getItem('showSahar');
    if (savedSaharEnd !== null) {
      setIsSaharEndEnabled(savedSaharEnd === 'true');
    }
    const savedAdhanVolume = localStorage.getItem('adhanVolume');
    if (savedAdhanVolume) {
      setAdhanVolume(parseInt(savedAdhanVolume));
    }
    const savedAdhanEnabled = localStorage.getItem('adhanEnabled');
    if (savedAdhanEnabled !== null) {
      setIsAdhanEnabled(savedAdhanEnabled === 'true');
    }
  }, [locations]);
  const handleLocationChange = (location: Location) => {
    setSelectedLocation(location);
    localStorage.setItem('selectedLocationId', location.id);
  };
  const handleRamadanToggle = (enabled: boolean) => {
    setIsRamadanMode(enabled);
    localStorage.setItem('isRamadan', enabled.toString());
    // Manual change implies override auto-detect
    localStorage.setItem('autoRamadanOverride', 'true');
  };
  const handleSaharEndToggle = (enabled: boolean) => {
    setIsSaharEndEnabled(enabled);
    localStorage.setItem('showSahar', enabled.toString());
  };
  const handleAdhanToggle = (enabled: boolean) => {
    setIsAdhanEnabled(enabled);
    localStorage.setItem('adhanEnabled', enabled.toString());
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
  return <div className="p-4 pb-20 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl p-4 text-center border border-green-100 py-0 px-[2px]">
        <h2 className="text-xl font-bold text-gray-800 mb-1">
          {tamilText.general.settings.english}
        </h2>
        <p className="text-sm text-gray-500">
          {tamilText.general.settings.tamil}
        </p>
      </div>

      {/* Location Settings */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-3">Location</h3>
        <LocationSelector selectedLocation={selectedLocation} onLocationChange={handleLocationChange} />
      </div>

      {/* Date Selection */}
      <div className="bg-white rounded-xl p-4 border border-green-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Date Selection</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">Selected Date</span>
            <span className="text-sm font-medium text-gray-800">
              {selectedDate ? format(selectedDate, 'MMMM do, yyyy') : 'No date selected'}
            </span>
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent mode="single" selected={selectedDate} onSelect={date => {
                setSelectedDate(date);
                if (date) {
                  sessionStorage.setItem('selectedDate', date.toISOString());
                }
              }} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex gap-2">
            <button onClick={() => {
            const today = new Date();
            setSelectedDate(today);
            sessionStorage.setItem('selectedDate', today.toISOString());
          }} className="flex-1 py-2 px-4 bg-green-50 text-green-600 rounded-lg text-sm font-medium">
              Today
            </button>
            <button onClick={() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setSelectedDate(tomorrow);
            sessionStorage.setItem('selectedDate', tomorrow.toISOString());
          }} className="flex-1 py-2 px-4 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium">
              Tomorrow
            </button>
          </div>
        </div>
      </div>

      {/* Theme */}
      

      {/* Prayer Settings */}
      <div className="bg-white rounded-xl p-4 border border-green-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Prayer Settings</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-700">ரமலான் நேரங்கள்/Ramadan Timings</span>
            </div>
            <Switch checked={isRamadanMode} onCheckedChange={handleRamadanToggle} />
          </div>
          {isRamadanMode && <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-700">சஹர் முடிவு நேரம்/Sahar End</span>
              </div>
              <Switch checked={isSaharEndEnabled} onCheckedChange={handleSaharEndToggle} />
            </div>}
          <button onClick={handleResetAutoRamadan} className="w-full py-2 px-4 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium">
            Reset to Auto-detect
          </button>
        </div>
      </div>

      {/* Hijri Date Adjustment */}
      <div className="bg-white rounded-xl p-4 border border-green-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Hijri Date Adjustment</h3>
        <HijriAdjustment />
        <p className="text-xs text-gray-500 mt-2">
          Adjust Hijri date to match your local moon sighting. Default is -1 day.
        </p>
      </div>

      {/* Adhan Sound Notifications */}
      <div className="bg-white rounded-xl p-4 border border-green-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
          Adhan Sound Notifications
        </h3>
        <div className="space-y-4">
          {!supported && <p className="text-sm text-red-600 text-center">
              Notifications not supported in this browser
            </p>}
          
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-800">Enable Adhan Notifications</span>
              <p className="text-xs text-gray-500 mt-1">
                Play adhan sound and show notifications during prayer times
              </p>
              {permission === 'denied' && <p className="text-xs text-red-500 mt-1">
                  Permission denied. Please enable in browser settings.
                </p>}
            </div>
            <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationToggle} disabled={!supported || permission === 'denied'} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Volume</span>
            <span className="text-sm font-medium text-gray-800">{adhanVolume}%</span>
          </div>
          <Slider value={[adhanVolume]} onValueChange={handleVolumeChange} max={100} min={0} step={5} className="w-full" />
        </div>
      </div>
    </div>;
};