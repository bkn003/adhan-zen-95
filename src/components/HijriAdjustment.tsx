import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface HijriAdjustmentProps {
  onAdjustmentChange?: (adjustment: number) => void;
}

export const HijriAdjustment = ({ onAdjustmentChange }: HijriAdjustmentProps) => {
  const [hijriAdjustment, setHijriAdjustment] = useState(() => {
    const saved = localStorage.getItem('hijriAdjustment');
    return saved !== null ? parseInt(saved) : -1; // Default to -1
  });
  const [tempAdjustment, setTempAdjustment] = useState(hijriAdjustment.toString());
  const [isOpen, setIsOpen] = useState(false);

  const handleAdjustmentSave = () => {
    const adjustment = parseInt(tempAdjustment) || 0;
    setHijriAdjustment(adjustment);
    localStorage.setItem('hijriAdjustment', adjustment.toString());
    onAdjustmentChange?.(adjustment);
    setIsOpen(false);
  };

  const resetToDefault = () => {
    setTempAdjustment('-1');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full py-3 px-4 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium border border-gray-200">
          <Settings className="w-4 h-4 mr-2" />
          Adjust Hijri Date ({hijriAdjustment >= 0 ? '+' : ''}{hijriAdjustment})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Hijri Date</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">
              Days adjustment (±)
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={tempAdjustment}
                onChange={(e) => setTempAdjustment(e.target.value)}
                placeholder="-1"
                className="flex-1"
                min="-30"
                max="30"
              />
              <Button onClick={handleAdjustmentSave} className="px-6">
                Apply
              </Button>
            </div>
            <div className="flex gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetToDefault}
                className="text-xs"
              >
                Reset to Default (-1)
              </Button>
            </div>
            <div className="text-xs text-gray-500 mt-3 p-2 bg-gray-50 rounded">
              <p className="font-medium mb-1">Current Setting: {hijriAdjustment >= 0 ? '+' : ''}{hijriAdjustment} days</p>
              <p>
                <span className="text-green-600">Default: -1 day</span> (Most common local adjustment)
              </p>
              <p className="mt-1">
                This adjustment is applied to align the Hijri date with your local moon sighting.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};