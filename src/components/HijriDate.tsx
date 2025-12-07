import { Calendar, Settings } from 'lucide-react';
import { useHijriDate } from '@/hooks/useHijriDate';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface HijriDateProps {
  selectedDate?: Date;
}

// Hijri month names for better display
const HIJRI_MONTHS = [
  'Muharram', 'Safar', 'Rabīʿ al-Awwal', 'Rabīʿ al-Thānī',
  'Jumādá al-Ūlá', 'Jumādá al-Ākhirah', 'Rajab', 'Shaʿbān',
  'Ramaḍān', 'Shawwāl', 'Dhū al-Qaʿdah', 'Dhū al-Ḥijjah'
];

export const HijriDate = ({
  selectedDate
}: HijriDateProps) => {
  const [hijriAdjustment, setHijriAdjustment] = useState(() => {
    const saved = localStorage.getItem('hijriAdjustment');
    return saved !== null ? parseInt(saved) : -1;
  });
  const [tempAdjustment, setTempAdjustment] = useState(hijriAdjustment.toString());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setTempAdjustment(hijriAdjustment.toString());
  }, [hijriAdjustment]);

  const {
    data: hijriDate,
    isLoading,
    error
  } = useHijriDate(selectedDate);

  const handleAdjustmentSave = () => {
    const adjustment = parseInt(tempAdjustment) || 0;
    setHijriAdjustment(adjustment);
    localStorage.setItem('hijriAdjustment', adjustment.toString());
    setTempAdjustment(adjustment.toString());
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-gray-100 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !hijriDate) {
    return (
      <div className="bg-white border border-green-100 rounded-2xl p-4">
        <div className="flex items-center gap-3 text-center justify-center">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-gray-500">Unable to load Islamic date</span>
        </div>
      </div>
    );
  }

  const displayDate = selectedDate || new Date();
  const currentDate = displayDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Parse and format Hijri date for better readability
  const formatHijriDate = (dateStr: string) => {
    // dateStr is typically like "15 Jumādá al-Ākhirah 1447"
    const parts = dateStr.split(' ');
    if (parts.length >= 3) {
      const day = parts[0];
      const year = parts[parts.length - 1];
      // Month name might contain spaces, so join the middle parts
      const monthParts = parts.slice(1, parts.length - 1);
      const month = monthParts.join(' ');

      return {
        day,
        month,
        year
      };
    }
    return null;
  };

  const hijriParts = formatHijriDate(hijriDate.adjustedDate);

  return (
    <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 border border-green-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 bg-emerald-100 rounded-xl shrink-0">
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex flex-col min-w-0">
            {hijriParts ? (
              <>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl font-bold text-emerald-700">{hijriParts.day}</span>
                  <span className="text-sm font-semibold text-emerald-600 truncate">{hijriParts.month}</span>
                  <span className="text-lg font-bold text-emerald-700">{hijriParts.year}</span>
                  <span className="text-xs text-emerald-500">AH</span>
                </div>
              </>
            ) : (
              <span className="text-base font-bold text-emerald-700">{hijriDate.adjustedDate}</span>
            )}
            <p className="text-xs text-gray-500 mt-0.5 truncate">{currentDate}</p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0 hover:bg-emerald-100">
              <Settings className="h-4 w-4 text-emerald-600" />
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[90vw] max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-center">Adjust Hijri Date</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Days adjustment (±)</label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="number"
                    value={tempAdjustment}
                    onChange={(e) => setTempAdjustment(e.target.value)}
                    placeholder="0"
                    className="flex-1 text-center text-lg font-mono"
                  />
                  <Button onClick={handleAdjustmentSave} className="bg-emerald-600 hover:bg-emerald-700">
                    Apply
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-3 space-y-1">
                  <span className="block">Current: {hijriDate.adjustedDate}</span>
                  <span className="block text-emerald-600">Default adjustment: -1 day</span>
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};