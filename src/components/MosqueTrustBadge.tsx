import React from 'react';
import { ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import { useMosqueFreshness } from '@/hooks/useMosqueFreshness';

interface MosqueTrustBadgeProps {
  locationId: string;
  /** compact = inline chips (lists), full = detail card */
  variant?: 'compact' | 'full';
}

const relative = (daysAgo: number | null) => {
  if (daysAgo === null) return 'never recorded';
  if (daysAgo === 0) return 'updated today';
  if (daysAgo === 1) return 'updated yesterday';
  if (daysAgo < 30) return `updated ${daysAgo} days ago`;
  const months = Math.round(daysAgo / 30);
  return `updated ${months} month${months > 1 ? 's' : ''} ago`;
};

export const MosqueTrustBadge: React.FC<MosqueTrustBadgeProps> = ({ locationId, variant = 'compact' }) => {
  const { data } = useMosqueFreshness([locationId]);
  const f = data?.[locationId];
  if (!f) return null;

  const tone =
    f.label === 'Excellent' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : f.label === 'Good' ? 'bg-blue-100 text-blue-700 border-blue-200'
        : f.label === 'Stale' ? 'bg-amber-100 text-amber-800 border-amber-200'
          : 'bg-gray-100 text-gray-600 border-gray-200';

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {f.verified && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-2.5 h-2.5" /> Verified
          </span>
        )}
        <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${tone}`}>
          <Clock className="w-2.5 h-2.5" /> {relative(f.daysAgo)}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
          {f.verified ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-amber-500" />}
          {f.verified ? 'Verified mosque' : 'Not yet verified'}
        </p>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tone}`}>{f.label} · {f.score}/100</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${f.score >= 85 ? 'bg-emerald-500' : f.score >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`}
          style={{ width: `${f.score}%` }}
        />
      </div>
      <p className="text-[11px] text-gray-600">
        Timings {relative(f.daysAgo)}
        {f.lastUpdated && f.lastUpdated.getFullYear() > 1980
          ? ` (${f.lastUpdated.toLocaleDateString()} ${f.lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})`
          : ''}
        . {f.verified
          ? 'A mosque admin maintains this schedule.'
          : 'No mosque admin has claimed this listing yet — timings may be community-sourced.'}
      </p>
    </div>
  );
};
