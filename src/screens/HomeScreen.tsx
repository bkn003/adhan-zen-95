import React, { useState, useEffect } from 'react';
import { PrayerCard } from '@/components/PrayerCard';
import { HijriDate } from '@/components/HijriDate';
import { LocationSelector } from '@/components/LocationSelector';
import { RamadanToggle } from '@/components/RamadanToggle';
import { RamadanSpecialTimes } from '@/components/RamadanSpecialTimes';
import { ForbiddenTimes } from '@/components/ForbiddenTimes';
import { SaharToggle } from '@/components/SaharToggle';
import { NextPrayerCard } from '@/components/NextPrayerCard';
import { useLocations } from '@/hooks/useLocations';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { useHijriDate } from '@/hooks/useHijriDate';
import { useStaticPrayerTimes, convertToPrayerObject, createForbiddenTimes } from '@/hooks/useStaticPrayerTimes';
import { getPrayerTimesForDate } from '@/utils/staticPrayerTimes';
import { usePrayerWorker } from '@/hooks/usePrayerWorker';
import { usePrayerNotifications } from '@/hooks/usePrayerNotifications';
import { tamilText } from '@/utils/tamilText';
import type { Location, Prayer } from '@/types/prayer.types';
import { Capacitor } from '@capacitor/core';
import { scheduleTodayAdhanNotifications } from '@/native/useNativeAdhanScheduler';
import { saveDailySchedule, saveSelectedLocation, cacheLocations, cleanOldSchedules, loadDailySchedule } from '@/storage/prayerStore';
import { initializeOfflineAdhanService } from '@/native/offlineAdhanService';
import { scheduleAdhanWithMedian, savePrayerTimesForBoot, registerMedianPrayerTimesSaver, isMedianApp } from '@/native/medianBridge';
import { useRamadanContext } from '@/contexts/RamadanContext';
import { useAdhanInitializer } from '@/hooks/useAdhanInitializer';
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

  // Initialize Adhan system (download audio, setup offline support)
  const { isInitialized, audioReady } = useAdhanInitializer();

  const [offlineFallbackTimes, setOfflineFallbackTimes] = useState<Prayer[]>([]);

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

  // Initialize offline capabilities on mount
  useEffect(() => {
    // Pre-cache Adhan audio for offline playback (foreground)
    import('@/storage/audioStore').then(({ ensureAdhanAudioCached }) => {
      ensureAdhanAudioCached('/adhan-native.mp3').catch(() => { });
    });

    // Initialize offline Adhan service for native platforms
    if (Capacitor.isNativePlatform()) {
      initializeOfflineAdhanService().catch(console.error);
    }

    // Clean old schedules periodically
    cleanOldSchedules().catch(console.error);
  }, []);

  // Cache locations when they load
  useEffect(() => {
    if (locations && locations.length > 0) {
      cacheLocations(locations).catch(console.error);
    }
  }, [locations]);

  // Get Hijri date for the selected date
  const { data: hijriDate } = useHijriDate(selectedDate);
  console.log('🗓️ HomeScreen hijriDate:', hijriDate);
  // Try static prayer times first
  const { data: staticPrayerTimesData, isLoading: isStaticLoading, error: staticError } = useStaticPrayerTimes(
    selectedLocation?.id || '',
    selectedDate,
    selectedLocation
  );

  // Process prayer times based on data source
  let processedPrayerTimes, processedForbiddenTimes;

  if (staticPrayerTimesData && staticPrayerTimesData.times.length > 0) {
    // Use static data - find prayer times for selected date
    const dailyPrayerTime = getPrayerTimesForDate(staticPrayerTimesData.times, selectedDate);
    if (dailyPrayerTime) {
      processedPrayerTimes = convertToPrayerObject(dailyPrayerTime, false, false);
      processedForbiddenTimes = createForbiddenTimes(dailyPrayerTime);
    } else {
      processedPrayerTimes = [];
      processedForbiddenTimes = [];
    }
  } else {
    processedPrayerTimes = [];
    processedForbiddenTimes = [];
  }

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

  // Sync Ramadan state to context for use in other screens
  const { setIsRamadan } = useRamadanContext();

  useEffect(() => {
    setIsRamadan(isRamadan);
  }, [isRamadan, setIsRamadan]);

  // Offline fallback: load stored prayers from IndexedDB when no data available
  useEffect(() => {
    if (!selectedLocation || !selectedDate) return;
    if (processedPrayerTimes.length > 0 || prayerTimes.length > 0) {
      setOfflineFallbackTimes([]);
      return;
    }
    loadDailySchedule(selectedLocation.id, selectedDate)
      .then((stored) => {
        if ((stored as any)?.prayers?.length) {
          setOfflineFallbackTimes((stored as any).prayers as Prayer[]);
        }
      })
      .catch(console.error);
  }, [selectedLocation?.id, selectedDate, processedPrayerTimes, prayerTimes]);

  // Use processed data if available, otherwise use hook data
  const finalPrayerTimes =
    processedPrayerTimes.length > 0
      ? processedPrayerTimes
      : prayerTimes.length > 0
        ? prayerTimes
        : offlineFallbackTimes;
  const finalForbiddenTimes = processedForbiddenTimes.length > 0 ? processedForbiddenTimes : forbiddenTimes;

  // Enhanced Median.co Adhan scheduling integration
  useEffect(() => {
    if (finalPrayerTimes.length > 0 && selectedLocation) {
      // Schedule via Median.co bridge if available
      if (isMedianApp()) {
        scheduleAdhanWithMedian(finalPrayerTimes, selectedDate);
        savePrayerTimesForBoot(finalPrayerTimes);
        registerMedianPrayerTimesSaver(finalPrayerTimes);
      }
      // Fallback to legacy window.saveTodayPrayerTimes for compatibility
      else if (typeof window !== 'undefined' && (window as any).saveTodayPrayerTimes) {
        const todayPrayerTimes: Record<string, string> = {};
        finalPrayerTimes.forEach(prayer => {
          switch (prayer.type) {
            case 'fajr':
              todayPrayerTimes.fajr = prayer.adhan;
              break;
            case 'dhuhr':
              todayPrayerTimes.dhuhr = prayer.adhan;
              break;
            case 'asr':
              todayPrayerTimes.asr = prayer.adhan;
              break;
            case 'maghrib':
              todayPrayerTimes.maghrib = prayer.adhan;
              break;
            case 'isha':
              todayPrayerTimes.isha = prayer.adhan;
              break;
            case 'jummah':
              if (selectedDate.getDay() === 5) {
                todayPrayerTimes.jummah = prayer.adhan;
              }
              break;
          }
        });
        console.log('📱 Scheduling native Adhan times (legacy):', todayPrayerTimes);
        (window as any).saveTodayPrayerTimes(todayPrayerTimes);
      }
    }
  }, [finalPrayerTimes, selectedLocation, selectedDate]);

  // Schedule native local notifications for Adhan (Android via Capacitor)
  // AND save to IndexedDB for offline use
  useEffect(() => {
    if (!selectedLocation || finalPrayerTimes.length === 0) return;
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      try {
        // Save to IndexedDB for offline use
        await saveDailySchedule(
          selectedLocation.id,
          selectedDate,
          finalPrayerTimes,
          selectedLocation.mosque_name
        );

        // Schedule notifications
        await scheduleTodayAdhanNotifications(finalPrayerTimes, selectedDate);

        // Update the countdown notification service with prayer times
        const { updateCountdownPrayers } = await import('@/native/dndService');
        const countdownPrayers = finalPrayerTimes
          .filter(p => ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jummah'].includes(p.type))
          .map(p => ({ name: p.name, adhan: p.adhan }));
        await updateCountdownPrayers(countdownPrayers);

        console.log('✅ Scheduled native Adhan notifications + updated countdown + saved for offline:', selectedDate.toDateString());
      } catch (e) {
        console.error('❌ Failed to schedule native Adhan notifications:', e);
      }
    })();
  }, [selectedLocation?.id, selectedDate, finalPrayerTimes]);

  // Initialize prayer worker for background adhan
  const {
    requestNotificationPermission
  } = usePrayerWorker(prayerTimes, selectedLocation?.id);

  // Initialize prayer notifications
  usePrayerNotifications(prayerTimes);

  // Load persisted location or auto-select first location
  useEffect(() => {
    const syncLocationToNative = async (locationId: string) => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { saveSelectedLocation: saveNativeLocation } = await import('@/native/dndService');
          await saveNativeLocation(locationId);
          console.log('📍 Synced location to native for background fetching');
        } catch (e) {
          console.error('Failed to sync location to native:', e);
        }
      }
    };

    if (selectedLocationId && locations) {
      const location = locations.find(loc => loc.id === selectedLocationId);
      if (location) {
        console.log('Setting location from prop:', location);
        setSelectedLocation(location);
        syncLocationToNative(location.id);
        return;
      }
    }
    const persistedLocationId = localStorage.getItem('selectedLocationId');
    if (persistedLocationId && locations) {
      const location = locations.find(loc => loc.id === persistedLocationId);
      if (location) {
        console.log('Setting location from localStorage:', location);
        setSelectedLocation(location);
        syncLocationToNative(location.id);
        return;
      }
    }
    if (!selectedLocation && locations && locations.length > 0) {
      console.log('Auto-selecting first location:', locations[0]);
      setSelectedLocation(locations[0]);
      localStorage.setItem('selectedLocationId', locations[0].id);
      syncLocationToNative(locations[0].id);
    }
  }, [locations, selectedLocation, selectedLocationId]);
  const handleLocationChange = async (location: Location) => {
    console.log('Location changed to:', location);
    setSelectedLocation(location);
    localStorage.setItem('selectedLocationId', location.id);

    // Save to IndexedDB for offline access
    saveSelectedLocation({
      id: location.id,
      mosque_name: location.mosque_name,
      district: location.district
    }).catch(console.error);

    // Save to native storage for background prayer time fetching
    // This is CRITICAL for alarms to work when app hasn't been opened for days
    if (Capacitor.isNativePlatform()) {
      try {
        const { saveSelectedLocation: saveNativeLocation } = await import('@/native/dndService');
        await saveNativeLocation(location.id);
        console.log('📍 Saved location to native for background fetching');
      } catch (e) {
        console.error('Failed to save location to native:', e);
      }
    }

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
  const isLoading = locationsLoading || (isStaticLoading || (staticError && prayerTimesLoading));
  // Allow all prayers to show in next prayer banner, including Ramadan-specific ones
  const filteredNextPrayer = nextPrayer;
  return <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-white">
    <div className="p-4 space-y-4 px-[4px] py-[2px]">
      {/* Next Prayer Card */}
      {filteredNextPrayer && (
        <NextPrayerCard
          nextPrayer={filteredNextPrayer}
          selectedLocation={selectedLocation || undefined}
        />
      )}
      {/* Location Selector */}
      <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm">
        <LocationSelector selectedLocation={selectedLocation} onLocationChange={handleLocationChange} />
      </div>

      {/* Hijri Date */}
      <HijriDate selectedDate={selectedDate} />


      {/* Ramadan Special Times */}
      <RamadanSpecialTimes prayers={finalPrayerTimes} isRamadan={isRamadan} />

      {/* Prayer Times Heading */}
      {!isLoading && finalPrayerTimes.length > 0 && (() => {
        const now = new Date();
        const isFriday = now.getDay() === 5;
        const isJummahTime = isFriday && finalPrayerTimes.some(p => {
          if (p.name === 'Jummah' || p.name.includes('Dhuhr') || p.name.includes('Zuhr')) {
            const adhanTime = new Date(p.adhanTime);
            const iqamahTime = p.iqamahTime ? new Date(p.iqamahTime) : null;
            if (iqamahTime) {
              return now >= adhanTime && now <= iqamahTime;
            }
          }
          return false;
        });

        return (
          <div className="bg-white rounded-xl border border-green-100 shadow-sm">
            <div className="grid grid-cols-3 text-center py-3 border-b border-green-100">
              <div>
                <p className="text-sm font-semibold text-gray-700">{tamilText.general.prayer.english}</p>
                <p className="text-xs text-gray-500">{tamilText.general.prayer.tamil}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">{tamilText.times.adhan.english}</p>
                <p className="text-xs text-gray-500">{tamilText.times.adhan.tamil}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  {isJummahTime ? tamilText.times.khutbah.english : tamilText.times.iqamah.english}
                </p>
                <p className="text-xs text-gray-500">
                  {isJummahTime ? tamilText.times.khutbah.tamil : tamilText.times.iqamah.tamil}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Prayer Times Cards */}
      {isLoading ? <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="animate-pulse">
          <div className="h-16 bg-gray-100 rounded-xl"></div>
        </div>)}
      </div> : finalPrayerTimes.length > 0 ? <div className="space-y-2">
        {finalPrayerTimes.map(prayer => {
          // Filter out special Ramadan times from main prayer list
          if (isRamadan && (prayer.name === 'Sahar End' || prayer.name === 'Iftar' || prayer.name === 'Tharaweeh')) {
            return null;
          }
          return <PrayerCard key={prayer.name} prayer={prayer} isNext={filteredNextPrayer?.name === prayer.name} timeUntilNext={filteredNextPrayer?.name === prayer.name ? timeUntilNext : undefined} />;
        })}
      </div> : <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
        <p className="text-gray-500">
          {selectedLocation
            ? (!navigator.onLine
              ? `📶 Turn on internet to view prayer times for ${selectedLocation.mosque_name}. No cached data available for this location.`
              : `No prayer times available for ${selectedLocation.mosque_name} today.`)
            : 'Please select a location to view prayer times.'
          }
        </p>
      </div>}

      {/* Forbidden Times */}
      <ForbiddenTimes forbiddenTimes={finalForbiddenTimes} />

      {/* Ramadan Toggle */}
      <RamadanToggle isRamadan={isRamadan} onToggle={toggleRamadan} onResetAuto={resetAutoRamadan} autoOverride={autoRamadanOverride} isRamadanMonth={hijriDate?.monthNumber === 9} />
    </div>
  </div>;
};