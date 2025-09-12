import { Moon, Clock } from 'lucide-react';
import { formatTo12Hour } from '@/utils/timeFormat';

interface SaharToggleProps {
  showSahar: boolean;
  onToggle: () => void;
  saharTime?: string;
}

export const SaharToggle = ({ showSahar, onToggle, saharTime }: SaharToggleProps) => {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <button
        onClick={onToggle}
        className={`
          flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 w-full
          ${showSahar 
            ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 text-orange-800' 
            : 'bg-card border-border text-muted-foreground hover:border-orange-200'
          }
        `}
      >
        <div className={`p-2 rounded-full ${showSahar ? 'bg-orange-100' : 'bg-muted'}`}>
          <Moon className="w-4 h-4" />
        </div>
        <div className="text-left flex-1">
          <p className="font-medium">
            {showSahar ? 'Sahar Time Enabled' : 'Show Sahar Time'}
          </p>
          <p className="text-sm opacity-75">
            {showSahar ? 'Sahar end time is visible' : 'Tap to show Sahar end time'}
          </p>
        </div>
        <div className={`
          ml-auto w-12 h-6 rounded-full transition-colors relative
          ${showSahar ? 'bg-orange-600' : 'bg-gray-300'}
        `}>
          <div className={`
            absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform
            ${showSahar ? 'translate-x-6' : 'translate-x-0.5'}
          `} />
        </div>
      </button>
      
      {showSahar && saharTime && (
        <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-orange-800">Sahar End Time</p>
              <p className="text-sm text-orange-600">ஸஹர் முடிவு</p>
            </div>
            <div className="ml-auto">
              <p className="text-lg font-mono font-bold text-orange-800">
                {formatTo12Hour(saharTime)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};