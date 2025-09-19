
import { useQuery } from '@tanstack/react-query';
import type { HijriDate } from '@/types/prayer.types';

export const useHijriDate = (selectedDate?: Date, hijriAdjustment?: number) => {
  // Use passed hijriAdjustment or get from localStorage
  const getHijriAdjustment = () => {
    if (hijriAdjustment !== undefined) {
      return hijriAdjustment;
    }
    const saved = localStorage.getItem('hijriAdjustment');
    return saved !== null ? parseInt(saved) : -1;
  };

  const currentAdjustment = getHijriAdjustment();

  return useQuery({
    queryKey: ['hijriDate', selectedDate?.toISOString(), currentAdjustment],
    queryFn: async (): Promise<HijriDate> => {
      try {
        const targetDate = selectedDate || new Date();
        // Apply manual Hijri adjustment at the API level when available
        const dd = String(targetDate.getDate()).padStart(2, '0');
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const yyyy = targetDate.getFullYear();
        const dateStr = `${dd}-${mm}-${yyyy}`; // DD-MM-YYYY
        const adj = currentAdjustment;
        let response = await fetch(`https://api.aladhan.com/v1/gToH/${dateStr}?adjustment=${adj}`);
        let data = await response.json();
        
        // Fallback: try query param format if path param fails
        if (data.code !== 200) {
          response = await fetch(`https://api.aladhan.com/v1/gToH?date=${dateStr}&adjustment=${adj}`);
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
