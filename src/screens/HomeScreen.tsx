import React, { useState, useEffect } from 'react';
import { PrayerCard } from '@/components/PrayerCard';
import { HijriDate } from '@/components/HijriDate';
import { LocationSelector } from '@/components/LocationSelector';
import { RamadanToggle } from '@/components/RamadanToggle';
import { ForbiddenTimes } from '@/components/ForbiddenTimes';
import { LocationSearch } from '@/components/LocationSearch';
import { SaharToggle } from '@/components/SaharToggle';
import { useLocations } from '@/hooks/useLocations';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { useHijriDate } from '@/hooks/useHijriDate';
import { usePrayerWorker } from '@/hooks/usePrayerWorker';
import { usePrayerNotifications } from '@/hooks/usePrayerNotifications';
import { tamilText } from '@/utils/tamilText';
import type { Location } from '@/types/prayer.types';
interface HomeScreenProps {
  selectedLocationId?: string;
  onLocationSelect?: (locationId: string) => void;
}
export const HomeScreen = ({
  selectedLocationId,
  onLocationSelect
}: HomeScreenProps) => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const {
    data: locations,
    isLoading: locationsLoading
  } = useLocations();

  // Load selected date from sessionStorage or use current date
  useEffect(() => {
    const savedDate = sessionStorage.getItem('selectedDate');
    if (savedDate) {
      setSelectedDate(new Date(savedDate));
    } else {
      // No saved date or after refresh/revisit, use current date
      const today = new Date();
      setSelectedDate(today);
      sessionStorage.setItem('selectedDate', today.toISOString());
    }
  }, []);

  // Save selected date to sessionStorage whenever it changes
  useEffect(() => {
    if (selectedDate) {
      sessionStorage.setItem('selectedDate', selectedDate.toISOString());
    }
  }, [selectedDate]);

  // Get Hijri date for the selected date
  const {
    data: hijriDate
  } = useHijriDate(selectedDate);
  console.log('🗓️ HomeScreen hijriDate:', hijriDate);
  const {
    prayerTimes,
    nextPrayer,
    timeUntilNext,
    forbiddenTimes,
    isRamadan,
    toggleRamadan,
    resetAutoRamadan,
    autoRamadanOverride,
    showSahar,
    toggleSahar,
    saharTime,
    isLoading: prayerTimesLoading
  } = usePrayerTimes(selectedLocation?.id, selectedDate, hijriDate?.monthNumber);

  // Initialize prayer worker for background adhan
  const {
    requestNotificationPermission
  } = usePrayerWorker(prayerTimes, selectedLocation?.id);

  // Initialize prayer notifications
  usePrayerNotifications(prayerTimes);

  // Load persisted location or auto-select first location
  useEffect(() => {
    if (selectedLocationId && locations) {
      const location = locations.find(loc => loc.id === selectedLocationId);
      if (location) {
        console.log('Setting location from prop:', location);
        setSelectedLocation(location);
        return;
      }
    }
    const persistedLocationId = localStorage.getItem('selectedLocationId');
    if (persistedLocationId && locations) {
      const location = locations.find(loc => loc.id === persistedLocationId);
      if (location) {
        console.log('Setting location from localStorage:', location);
        setSelectedLocation(location);
        return;
      }
    }
    if (!selectedLocation && locations && locations.length > 0) {
      console.log('Auto-selecting first location:', locations[0]);
      setSelectedLocation(locations[0]);
      localStorage.setItem('selectedLocationId', locations[0].id);
    }
  }, [locations, selectedLocation, selectedLocationId]);
  const handleLocationChange = (location: Location) => {
    console.log('Location changed to:', location);
    setSelectedLocation(location);
    localStorage.setItem('selectedLocationId', location.id);
    onLocationSelect?.(location.id);
  };

  // Debug logging
  useEffect(() => {
    console.log('HomeScreen state:', {
      selectedLocation: selectedLocation?.mosque_name,
      prayerTimes: prayerTimes.length,
      prayerTimesLoading,
      locationsLoading
    });
  }, [selectedLocation, prayerTimes, prayerTimesLoading, locationsLoading]);
  const isLoading = locationsLoading || prayerTimesLoading;
  // Allow all prayers to show in next prayer banner, including Ramadan-specific ones
  const filteredNextPrayer = nextPrayer;
  return <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-white">
      {/* Next Prayer Banner - Sticky */}
      {filteredNextPrayer && timeUntilNext && <div className="sticky top-0 z-40 bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg mx-2 mb-2">
          <div className="p-2 text-center px-0">
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm font-bold">Next Prayer: {filteredNextPrayer.name}</span>
              <span className="text-xs">அடுத்த தொழுகை</span>
              <span className="text-sm font-extrabold">{timeUntilNext} left</span>
            </div>
          </div>
        </div>}

      <div className="p-4 space-y-4 px-[4px] py-[2px]">
        {/* Combined Location Selector */}
        <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm py-[2px] px-0">
          
          <LocationSelector selectedLocation={selectedLocation} onLocationChange={handleLocationChange} />
        </div>

        {/* Location Search */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 px-[4px] py-0">
          <LocationSearch selectedLocation={selectedLocation} onLocationChange={handleLocationChange} placeholder="Search for mosques..." />
        </div>

        {/* Hijri Date */}
        <HijriDate selectedDate={selectedDate} />


      {/* Prayer Times Cards */}
      {isLoading ? <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-100 rounded-xl"></div>
            </div>)}
        </div> : prayerTimes.length > 0 ? <div className="space-y-2">
          {prayerTimes.map(prayer => <PrayerCard key={prayer.name} prayer={prayer} isNext={filteredNextPrayer?.name === prayer.name} timeUntilNext={filteredNextPrayer?.name === prayer.name ? timeUntilNext : undefined} />)}
        </div> : <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
          <p className="text-gray-500">
            {selectedLocation ? `No prayer times available for ${selectedLocation.mosque_name} today.` : 'Please select a location to view prayer times.'}
          </p>
        </div>}

        {/* Forbidden Times */}
        <ForbiddenTimes forbiddenTimes={forbiddenTimes} />

        {/* Ramadan Toggle */}
        <RamadanToggle isRamadan={isRamadan} onToggle={toggleRamadan} onResetAuto={resetAutoRamadan} autoOverride={autoRamadanOverride} isRamadanMonth={hijriDate?.monthNumber === 9} />
      </div>
    </div>;
};