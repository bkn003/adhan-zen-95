import React from 'react';
import { ArrowRight, TrendingDown, TrendingUp, Minus, Info } from 'lucide-react';
import { formatTo12Hour } from '@/utils/timeFormat';
import { describeDelta, impactText, deltaClasses } from '@/utils/timeDiff';

interface Props {
  label: string;
  from?: string | null;
  to?: string | null;
  /** Show the plain-language "why it matters" line. */
  showImpact?: boolean;
  compact?: boolean;
}

/** Before → after diff row for a single prayer-time field. */
export const PrayerTimeDiff: React.FC<Props> = ({ label, from, to, showImpact = true, compact }) => {
  const d = describeDelta(from, to);
  const Icon = d.direction === 'earlier' ? TrendingDown : d.direction === 'later' ? TrendingUp : Minus;

  return (
    <div className={compact ? 'px-3 py-2' : 'px-4 py-3'}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-800 truncate">{label}</span>
        <span
          className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${deltaClasses(d)}`}
        >
          <Icon className="w-3 h-3" /> {d.text}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <div className="flex-1 rounded-lg bg-gray-50 border border-gray-100 px-2 py-1.5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Before</p>
          <p className="text-sm font-bold text-gray-400 line-through">
            {from ? formatTo12Hour(from) : '—'}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
        <div className="flex-1 rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-1.5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-500">Now</p>
          <p className="text-sm font-bold text-emerald-700">{to ? formatTo12Hour(to) : '—'}</p>
        </div>
      </div>

      {showImpact && (
        <p className="mt-1.5 text-[11px] text-gray-500 flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 shrink-0 text-gray-400" />
          <span>{impactText(label, d)}</span>
        </p>
      )}
    </div>
  );
};
