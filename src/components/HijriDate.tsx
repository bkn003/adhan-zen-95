import { Calendar, Settings } from 'lucide-react';
import { useHijriDate } from '@/hooks/useHijriDate';
import { tamilText } from '@/utils/tamilText'; // keep for future localization, currently unused
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface HijriDateProps {
  selectedDate?: Date;
}

export const HijriDate = ({
  selectedDate
}: HijriDateProps) => {
  const [hijriAdjustment, setHijriAdjustment] = useState(() => {
    const saved = localStorage.getItem('hijriAdjustment');
    return saved !== null ? parseInt(saved) : -1; // Default to -1
  });
  const [tempAdjustment, setTempAdjustment] = useState(hijriAdjustment.toString());
  
  const {
    data: hijriDate,
    isLoading,
    error
  } = useHijriDate(selectedDate);

  const handleAdjustmentSave = () => {
    const adjustment = parseInt(tempAdjustment) || 0;
    setHijriAdjustment(adjustment);
    localStorage.setItem('hijriAdjustment', adjustment.toString());
    // Force re-render by updating the state immediately
    setTempAdjustment(adjustment.toString());
  };

  if (isLoading) {
    return <div className="animate-pulse">
        <div className="h-20 bg-gray-100 rounded-xl"></div>
      </div>;
  }

  if (error || !hijriDate) {
    return <div className="bg-white border border-green-100 rounded-xl p-4">
        <div className="flex items-center gap-3 text-center">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-gray-500">Unable to load Islamic date</span>
        </div>
      </div>;
  }

  const displayDate = selectedDate || new Date();
  const currentDate = displayDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // API returns Hijri date already adjusted via 'adjustment' param in useHijriDate
  const displayHijri = hijriDate.adjustedDate;

  return <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-xl p-3 text-center px-[4px] py-0">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-gray-800 mb-1 text-sm font-bold">
            {displayHijri}
          </h3>
          <p className="text-sm text-gray-500">{currentDate}</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adjust Hijri Date</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Days adjustment (±)
                </label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    value={tempAdjustment}
                    onChange={(e) => setTempAdjustment(e.target.value)}
                    placeholder="0"
                    className="flex-1"
                  />
                  <Button onClick={handleAdjustmentSave}>
                    Apply
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Current: {displayHijri}<br/>
                  Change the days adjustment and click Apply to update globally.<br/>
                  <span className="text-green-600">Default adjustment: -1 day</span>
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>;
};