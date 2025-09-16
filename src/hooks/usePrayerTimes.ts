
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Prayer, ForbiddenTime } from '@/types/prayer.types';

export const usePrayerTimes = (locationId?: string, selectedDate?: Date, hijriMonth?: number) => {
  const [isRamadan, setIsRamadan] = useState(false);
  const [showSahar, setShowSahar] = useState(false);
  const [autoRamadanOverride, setAutoRamadanOverride] = useState(false);

  // Load initial state from localStorage on mount
  useEffect(() => {
    console.log('🏁 Initial state loading effect running');
    
    // Load Sahar preference
    const savedSaharMode = localStorage.getItem('showSahar');
    if (savedSaharMode !== null) {
      setShowSahar(savedSaharMode === 'true');
    }

    // Load Ramadan override flag
    const savedAutoOverrideFlag = localStorage.getItem('autoRamadanOverride') === 'true';
    setAutoRamadanOverride(savedAutoOverrideFlag);

    // Load current Ramadan state (will be overridden by auto-detection if no override)
    const savedRamadanMode = localStorage.getItem('isRamadan');
    if (savedRamadanMode !== null) {
      setIsRamadan(savedRamadanMode === 'true');
    }

    console.log('🏁 Initial state loaded:', {
      savedSaharMode,
      savedAutoOverrideFlag,
      savedRamadanMode
    });
  }, []);

  // Handle Ramadan auto-detection whenever hijriMonth becomes available
  useEffect(() => {
    if (hijriMonth === undefined || hijriMonth === null) {
      console.log('⏳ Waiting for hijriMonth to be available');
      return;
    }

    console.log('🔄 Ramadan auto-detection effect running', { 
      hijriMonth, 
      currentDate: new Date().toISOString() 
    });

    const savedAutoOverrideFlag = localStorage.getItem('autoRamadanOverride') === 'true';

    // Auto-enable during Ramadan month (hijriMonth === 9) but respect manual override
    if (hijriMonth === 9) {
      if (!savedAutoOverrideFlag) {
        console.log('🌙 Hijri month is Ramadan, auto-enabling');
        setIsRamadan(true);
        localStorage.setItem('isRamadan', 'true');
      } else {
        console.log('🔧 Ramadan month but manual override active, preserving user choice');
      }
      return;
    }

    // Non-Ramadan months: respect manual override completely
    if (savedAutoOverrideFlag) {
      console.log('🔧 Manual override active in non-Ramadan month, preserving user choice');
      return; // do nothing, keep user's state
    }

    // No override: auto-disable
    console.log('🤖 Non-Ramadan month without override, auto-disabling');
    setIsRamadan(false);
    localStorage.setItem('isRamadan', 'false');
  }, [hijriMonth]);

  // Use selectedDate or current date
  const targetDate = selectedDate || new Date();
  const formattedDate = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD format

  const fetchPrayerTimes = async () => {
    if (!locationId) {
      console.log('No location ID provided');
      return null;
    }
    
    // Get target date info
    const currentDay = targetDate.getDate();
    const currentMonth = targetDate.toLocaleString('en-US', { month: 'long' });
    
    console.log('Fetching prayer times for:', { 
      locationId, 
      currentDay, 
      currentMonth, 
      targetDate: targetDate.toDateString() 
    });
    
    // Fetch all prayer times for current month and location
    const { data, error } = await supabase
      .from('prayer_times')
      .select('*')
      .eq('location_id', locationId)
      .eq('month', currentMonth);

    if (error) {
      console.error('Error fetching prayer times:', error);
      return null;
    }

    // Find the appropriate date range for current day
    const matchingRecord = data?.find(record => {
      const dateRange = record.date_range;
      
      // Parse date ranges like "1-5 May", "6-11 Nov", "12-17 Sep"
      const rangeMatch = dateRange.match(/(\d+)-(\d+)/);
      if (rangeMatch) {
        const startDay = parseInt(rangeMatch[1]);
        const endDay = parseInt(rangeMatch[2]);
        return currentDay >= startDay && currentDay <= endDay;
      }
      
      return false;
    });

    console.log('Fetched prayer times data:', matchingRecord);
    return matchingRecord || null;
  };

  const { data: prayerTimesData, isLoading, refetch } = useQuery({
    queryKey: ['prayer-times', locationId, formattedDate, selectedDate?.toISOString()],
    queryFn: fetchPrayerTimes,
    enabled: !!locationId,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - longer cache for prayer times
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Auto-refetch when location changes
  useEffect(() => {
    if (locationId) {
      console.log('Location changed, refetching data for:', locationId);
      refetch();
    }
  }, [locationId, refetch]);

  const prayerTimes: Prayer[] = useMemo(() => {
    if (!prayerTimesData) {
      console.log('No prayer times data available');
      return [];
    }

    console.log('Processing prayer times data:', prayerTimesData);
    
    // Check if target date is Friday
    const isFriday = targetDate.getDay() === 5;

    const prayers: Prayer[] = [
      {
        name: 'Fajr',
        type: 'fajr',
        adhan: prayerTimesData.fajr_adhan || '5:00',
        iqamah: isRamadan && prayerTimesData.fajr_ramadan_iqamah 
          ? prayerTimesData.fajr_ramadan_iqamah 
          : prayerTimesData.fajr_iqamah || '5:30'
      },
      {
        name: isFriday ? 'Jummah' : 'Dhuhr',
        type: isFriday ? 'jummah' : 'dhuhr',
        adhan: isFriday ? (prayerTimesData.jummah_adhan || prayerTimesData.dhuhr_adhan || '12:30') : (prayerTimesData.dhuhr_adhan || '12:30'),
        iqamah: isFriday ? (prayerTimesData.jummah_iqamah || prayerTimesData.dhuhr_iqamah || '1:00') : (prayerTimesData.dhuhr_iqamah || '1:00')
      },
      {
        name: 'Asr',
        type: 'asr',
        adhan: prayerTimesData.asr_adhan || '4:00',
        iqamah: prayerTimesData.asr_iqamah || '4:30'
      },
      {
        name: 'Maghrib',
        type: 'maghrib',
        adhan: isRamadan && prayerTimesData.maghrib_ramadan_adhan
          ? prayerTimesData.maghrib_ramadan_adhan
          : prayerTimesData.maghrib_adhan || '6:30',
        iqamah: isRamadan && prayerTimesData.maghrib_ramadan_iqamah
          ? prayerTimesData.maghrib_ramadan_iqamah
          : prayerTimesData.maghrib_iqamah || '6:35'
      },
      {
        name: 'Isha',
        type: 'isha',
        adhan: prayerTimesData.isha_adhan || '8:00',
        iqamah: isRamadan && prayerTimesData.isha_ramadan_iqamah
          ? prayerTimesData.isha_ramadan_iqamah
          : prayerTimesData.isha_iqamah || '8:30'
      }
    ];

    // Add Ramadan-specific prayers
    if (isRamadan) {
      // Add Sahar End at the beginning (always show when Ramadan is enabled)
      if (prayerTimesData.sahar_end) {
        prayers.unshift({
          name: 'Sahar End',
          type: 'fajr',
          adhan: prayerTimesData.sahar_end,
          iqamah: prayerTimesData.sahar_end
        });
      }

      // Add Iftar time
      if (prayerTimesData.ifthar_time) {
        prayers.splice(4, 0, {
          name: 'Iftar',
          type: 'maghrib',
          adhan: prayerTimesData.ifthar_time,
          iqamah: prayerTimesData.ifthar_time
        });
      }

      // Add Tharaweeh
      if (prayerTimesData.tharaweeh) {
        prayers.push({
          name: 'Tharaweeh',
          type: 'tarawih',
          adhan: prayerTimesData.tharaweeh,
          iqamah: prayerTimesData.tharaweeh
        });
      }
    }

    console.log('Processed prayers:', prayers);
    return prayers;
  }, [prayerTimesData, isRamadan, showSahar]);

  const forbiddenTimes: ForbiddenTime[] = useMemo(() => {
    if (!prayerTimesData) return [];

    return [
      {
        name: 'Sunrise',
        time: prayerTimesData.sun_rise || '6:00',
        type: 'sunrise'
      },
      {
        name: 'Mid Noon',
        time: prayerTimesData.mid_noon || '12:00',
        type: 'noon'
      },
      {
        name: 'Sunset',
        time: prayerTimesData.sun_set || '6:00',
        type: 'sunset'
      }
    ];
  }, [prayerTimesData]);

  const nextPrayer = useMemo(() => {
    if (prayerTimes.length === 0) return null;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    for (const prayer of prayerTimes) {
      // Convert time string (HH:MM:SS or HH:MM) to minutes
      const timeStr = prayer.adhan.split(':');
      const hours = parseInt(timeStr[0], 10);
      const minutes = parseInt(timeStr[1], 10);
      const prayerTime = hours * 60 + minutes;

      if (prayerTime > currentTime) {
        return prayer;
      }
    }

    // If no prayer found for today, return first prayer of next day
    return prayerTimes[0] || null;
  }, [prayerTimes]);

  const timeUntilNext = useMemo(() => {
    if (!nextPrayer) return null;

    const now = new Date();
    // Convert time string (HH:MM:SS or HH:MM) to time parts
    const timeStr = nextPrayer.adhan.split(':');
    const hours = parseInt(timeStr[0], 10);
    const minutes = parseInt(timeStr[1], 10);
    
    const prayerTime = new Date(now);
    prayerTime.setHours(hours, minutes, 0, 0);

    // If prayer time has passed today, set it for tomorrow
    if (prayerTime <= now) {
      prayerTime.setDate(prayerTime.getDate() + 1);
    }

    const diff = prayerTime.getTime() - now.getTime();
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hoursLeft > 0) {
      return `${hoursLeft}h ${minutesLeft}m`;
    } else {
      return `${minutesLeft}m`;
    }
  }, [nextPrayer]);

  const toggleRamadan = () => {
    const newRamadanState = !isRamadan;
    console.log('🔄 Manual Ramadan toggle:', { from: isRamadan, to: newRamadanState });
    setIsRamadan(newRamadanState);
    localStorage.setItem('isRamadan', newRamadanState.toString());
    // Set override when manually toggling to prevent auto-detection
    setAutoRamadanOverride(true);
    localStorage.setItem('autoRamadanOverride', 'true');
    console.log('🔧 Manual override flag set to preserve user choice');
  };

  const resetAutoRamadan = () => {
    console.log('🔄 Resetting auto-detection');
    setAutoRamadanOverride(false);
    localStorage.removeItem('autoRamadanOverride');
    // Re-apply auto detection based on current month
    if (hijriMonth === 9) {
      console.log('🌙 Re-enabling for Ramadan month');
      setIsRamadan(true);
      localStorage.setItem('isRamadan', 'true');
    } else {
      console.log('🤖 Re-disabling for non-Ramadan month');
      setIsRamadan(false);
      localStorage.setItem('isRamadan', 'false');
    }
  };

  const toggleSahar = () => {
    const newSaharState = !showSahar;
    setShowSahar(newSaharState);
    localStorage.setItem('showSahar', newSaharState.toString());
  };

  // Debug log
  useEffect(() => {
    console.log('Hook state:', {
      locationId,
      formattedDate,
      prayerTimesData,
      prayerTimes: prayerTimes.length,
      isLoading
    });
  }, [locationId, formattedDate, prayerTimesData, prayerTimes, isLoading]);

  return {
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
    saharTime: prayerTimesData?.sahar_end,
    isLoading
  };
};
