
import { useQuery } from '@tanstack/react-query';
import type { HijriDate } from '@/types/prayer.types';

export const useHijriDate = (selectedDate?: Date) => {
  // Get user's Hijri adjustment setting (default -1)
  const getHijriAdjustment = () => {
    const saved = localStorage.getItem('hijriAdjustment');
    return saved !== null ? parseInt(saved) : -1;
  };

  return useQuery({
    queryKey: ['hijriDate', selectedDate?.toISOString(), getHijriAdjustment()],
    queryFn: async (): Promise<HijriDate> => {
      try {
        const baseDate = selectedDate || new Date();
        // Apply manual Hijri adjustment by shifting the Gregorian date first
        const adj = getHijriAdjustment();
        const adjustedGregorian = new Date(baseDate);
        adjustedGregorian.setDate(adjustedGregorian.getDate() + adj);

        const dd = String(adjustedGregorian.getDate()).padStart(2, '0');
        const mm = String(adjustedGregorian.getMonth() + 1).padStart(2, '0');
        const yyyy = adjustedGregorian.getFullYear();
        const dateStr = `${dd}-${mm}-${yyyy}`; // DD-MM-YYYY

        let response = await fetch(`https://api.aladhan.com/v1/gToH/${dateStr}`);
        let data = await response.json();
        
        // Fallback: try query param format if path param fails
        if (data.code !== 200) {
          response = await fetch(`https://api.aladhan.com/v1/gToH?date=${dateStr}`);
          data = await response.json();
        }
        
        if (data.code === 200 && data.data) {
          const hijri = data.data.hijri;
          
          return {
            date: hijri.day,
            month: hijri.month.en,
            year: hijri.year,
            designation: hijri.designation.abbreviated,
            adjustedDate: `${hijri.day} ${hijri.month.en} ${hijri.year}`,
            monthNumber: hijri.month.number
          };
        }
        
        throw new Error('Failed to fetch Hijri date');
      } catch (error) {
        console.error('Error fetching Hijri date:', error);
        // Fallback to static date without applying manual adjustment (UI will adjust)
        const fallbackDay = 13;
        return {
          date: fallbackDay.toString(),
          month: 'Rabi al-Awwal',
          year: '1447',
          designation: 'AH',
          adjustedDate: `${fallbackDay} Rabi al-Awwal 1447`,
          monthNumber: 3
        };
      }
    },
    staleTime: 1000 * 60 * 60 * 12, // 12 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};
