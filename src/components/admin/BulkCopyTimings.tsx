import React, { useMemo, useState } from 'react';
import { Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminCall } from '@/utils/adminApi';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const RANGES = ['1-5', '6-11', '12-17', '18-23', '24-end'];

const monthEnd = (monthName: string) => {
  const idx = MONTHS.indexOf(monthName);
  if (idx === -1) return 31;
  return new Date(new Date().getFullYear(), idx + 1, 0).getDate();
};

const rangeLabel = (r: string, month: string) =>
  r === '24-end' ? `24-${monthEnd(month)}` : r;

interface Props {
  locationId: string;
  /** Existing prayer-time rows for the currently viewed month (used as source options). */
  prayerTimes: any[];
  selectedMonth: string;
  onDone: () => void;
}

/**
 * Copies every timing field from one date range to any set of other
 * date ranges across months. Existing target rows are updated, missing
 * ones are created.
 */
export const BulkCopyTimings: React.FC<Props> = ({ locationId, prayerTimes, selectedMonth, onDone }) => {
  const [sourceId, setSourceId] = useState<string>('');
  const [months, setMonths] = useState<Set<string>>(new Set([selectedMonth]));
  const [ranges, setRanges] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const source = useMemo(() => prayerTimes.find(p => p.id === sourceId), [prayerTimes, sourceId]);

  const targets = useMemo(() => {
    const out: { month: string; date_range: string }[] = [];
    months.forEach(m => ranges.forEach(r => {
      const dr = rangeLabel(r, m);
      if (source && m === source.month && dr === source.date_range) return;
      out.push({ month: m, date_range: dr });
    }));
    return out;
  }, [months, ranges, source]);

  const toggle = (set: Set<string>, v: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v); else next.add(v);
    apply(next);
  };

  const run = async () => {
    if (!sourceId) return toast.error('Pick a source date range first');
    if (!targets.length) return toast.error('Pick at least one target month and date range');
    if (!window.confirm(`Copy timings from ${source.date_range} ${source.month} to ${targets.length} range(s)? Existing timings there will be overwritten.`)) return;
    setBusy(true);
    try {
      const res = await adminCall<{ results: { month: string; date_range: string; status: string }[] }>(
        'bulk_copy_prayer_times',
        { location_id: locationId, data: { source_id: sourceId, targets } },
      );
      const ok = res.results.filter(r => !r.status.startsWith('error')).length;
      const failed = res.results.length - ok;
      if (failed) toast.warning(`Copied to ${ok} range(s), ${failed} failed`);
      else toast.success(`Copied to ${ok} date range(s)`);
      setRanges(new Set());
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-sky-50 rounded-xl border border-sky-200 p-3 space-y-3">
      <p className="text-xs font-bold text-sky-800 flex items-center gap-1.5">
        <Copy className="w-3.5 h-3.5" /> Bulk copy timings
      </p>

      {/* Source */}
      <div>
        <label className="text-[10px] font-semibold text-sky-700 uppercase">Copy from ({selectedMonth})</label>
        <select
          value={sourceId}
          onChange={e => setSourceId(e.target.value)}
          className="mt-1 w-full px-2 py-2 border border-sky-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        >
          <option value="">Select source date range…</option>
          {prayerTimes.map(pt => (
            <option key={pt.id} value={pt.id}>{pt.date_range} {pt.month}</option>
          ))}
        </select>
        {prayerTimes.length === 0 && (
          <p className="text-[10px] text-sky-600 mt-1">No ranges in {selectedMonth} yet — pick the source month above first.</p>
        )}
      </div>

      {/* Target months */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold text-sky-700 uppercase">To months</label>
          <button
            onClick={() => setMonths(months.size === 12 ? new Set() : new Set(MONTHS))}
            className="text-[10px] font-semibold text-sky-700 underline"
          >
            {months.size === 12 ? 'Clear' : 'All 12'}
          </button>
        </div>
        <div className="mt-1 grid grid-cols-4 gap-1">
          {MONTHS.map(m => (
            <button
              key={m}
              onClick={() => toggle(months, m, setMonths)}
              className={`px-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors ${
                months.has(m) ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-sky-700 border-sky-200'
              }`}
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Target ranges */}
      <div>
        <label className="text-[10px] font-semibold text-sky-700 uppercase">To date ranges</label>
        <div className="mt-1 flex flex-wrap gap-1">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => toggle(ranges, r, setRanges)}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1 transition-colors ${
                ranges.has(r) ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-sky-700 border-sky-200'
              }`}
            >
              {ranges.has(r) && <Check className="w-3 h-3" />}
              {r}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={run}
        disabled={busy || !sourceId || !targets.length}
        className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
        Copy to {targets.length} range{targets.length === 1 ? '' : 's'}
      </button>
      <p className="text-[10px] text-sky-600">
        Overwrites adhan/iqamah and special timings in the targets. The source range is never touched.
      </p>
    </div>
  );
};
