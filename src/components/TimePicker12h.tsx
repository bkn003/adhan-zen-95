import { useState, useEffect } from 'react';

interface TimePicker12hProps {
  value: string; // 24h format "HH:MM" or ""
  onChange: (value: string) => void;
  label?: string;
}

/**
 * Converts 24h format "HH:MM" to 12h parts
 */
function to12h(time24: string): { hour: string; minute: string; period: 'AM' | 'PM' } {
  if (!time24) return { hour: '', minute: '', period: 'AM' };
  const [h, m] = time24.split(':');
  const hour24 = parseInt(h, 10);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  return {
    hour: hour12.toString(),
    minute: m || '00',
    period: hour24 >= 12 ? 'PM' : 'AM',
  };
}

/**
 * Converts 12h parts back to 24h "HH:MM"
 */
function to24h(hour: string, minute: string, period: 'AM' | 'PM'): string {
  if (!hour || !minute) return '';
  let h = parseInt(hour, 10);
  if (period === 'AM' && h === 12) h = 0;
  if (period === 'PM' && h !== 12) h += 12;
  return `${h.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

/**
 * Format a 24h time string to 12h display
 */
export function formatTime12h(time24: string): string {
  if (!time24) return '-';
  const { hour, minute, period } = to12h(time24);
  if (!hour) return '-';
  return `${hour}:${minute} ${period}`;
}

export const TimePicker12h = ({ value, onChange, label }: TimePicker12hProps) => {
  const parsed = to12h(value);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period);

  // Sync from external value changes
  useEffect(() => {
    const p = to12h(value);
    setHour(p.hour);
    setMinute(p.minute);
    setPeriod(p.period);
  }, [value]);

  const emitChange = (h: string, m: string, p: 'AM' | 'PM') => {
    if (h && m) {
      onChange(to24h(h, m, p));
    }
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div>
      {label && (
        <label className="text-[10px] text-gray-500 uppercase block mb-1">{label}</label>
      )}
      <div className="flex items-center gap-1">
        {/* Hour */}
        <select
          value={hour}
          onChange={e => {
            setHour(e.target.value);
            emitChange(e.target.value, minute, period);
          }}
          className="flex-1 px-1.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/30 bg-white appearance-none text-center"
        >
          <option value="">--</option>
          {hours.map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>

        <span className="text-gray-400 text-xs font-bold">:</span>

        {/* Minute */}
        <select
          value={minute}
          onChange={e => {
            setMinute(e.target.value);
            emitChange(hour, e.target.value, period);
          }}
          className="flex-1 px-1.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/30 bg-white appearance-none text-center"
        >
          <option value="">--</option>
          {minutes.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* AM/PM */}
        <select
          value={period}
          onChange={e => {
            const newPeriod = e.target.value as 'AM' | 'PM';
            setPeriod(newPeriod);
            emitChange(hour, minute, newPeriod);
          }}
          className="px-1.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/30 bg-white font-semibold text-center"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
};
