import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';

const PRAYERS = [
  { key: 'fajr', label: 'Fajr', color: '#8b5cf6' },
  { key: 'dhuhr', label: 'Zuhr', color: '#0ea5e9' },
  { key: 'asr', label: 'Asr', color: '#f59e0b' },
  { key: 'maghrib', label: 'Maghrib', color: '#f43f5e' },
  { key: 'isha', label: 'Isha', color: '#10b981' },
] as const;

const RANGES = [
  { days: 7, label: '7D' },
  { days: 30, label: '30D' },
  { days: 90, label: '90D' },
];

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface TrendRow { attend_date: string; prayer: string; count: number }

/** Jamaat growth chart: daily attendance per prayer over 7/30/90 days. */
export const AttendanceTrends: React.FC<{ locationId: string }> = ({ locationId }) => {
  const [days, setDays] = useState(30);

  const { from, to } = useMemo(() => {
    const toD = new Date();
    const fromD = new Date();
    fromD.setDate(fromD.getDate() - (days - 1));
    return { from: dayKey(fromD), to: dayKey(toD) };
  }, [days]);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-trend', locationId, from, to],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_attendance_trend', {
        p_location_id: locationId,
        p_from: from,
        p_to: to,
      });
      if (error) throw error;
      return (data ?? []) as TrendRow[];
    },
  });

  // Pivot rows into recharts shape: [{ date, fajr, dhuhr, ... }]
  const chartData = useMemo(() => {
    const byDate = new Map<string, Record<string, any>>();
    (data ?? []).forEach(r => {
      const row = byDate.get(r.attend_date) ?? { date: r.attend_date };
      row[r.prayer] = Number(r.count);
      byDate.set(r.attend_date, row);
    });
    return [...byDate.values()].map(r => ({
      ...r,
      label: new Date(`${r.date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    }));
  }, [data]);

  // Per-prayer totals + growth: second half of the window vs first half
  const stats = useMemo(() => {
    const mid = new Date(from);
    mid.setDate(mid.getDate() + Math.floor(days / 2));
    const midKey = dayKey(mid);
    return PRAYERS.map(p => {
      let first = 0, second = 0, total = 0;
      (data ?? []).filter(r => r.prayer === p.key).forEach(r => {
        const c = Number(r.count);
        total += c;
        if (r.attend_date < midKey) first += c; else second += c;
      });
      const growth = first === 0 ? (second > 0 ? 100 : 0) : Math.round(((second - first) / first) * 100);
      return { ...p, total, growth };
    });
  }, [data, from, days]);

  const grandTotal = stats.reduce((s, x) => s + x.total, 0);

  return (
    <div className="space-y-3">
      {/* Range picker */}
      <div className="flex gap-1.5">
        {RANGES.map(r => (
          <button
            key={r.days}
            onClick={() => setDays(r.days)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              days === r.days ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
      ) : grandTotal === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">
          No attendance marked in this period yet. Trends appear once members use "I'm attending".
        </p>
      ) : (
        <>
          {/* Summary chips */}
          <div className="grid grid-cols-5 gap-1">
            {stats.map(s => (
              <div key={s.key} className="bg-gray-50 rounded-lg p-1.5 text-center">
                <p className="text-[9px] font-semibold" style={{ color: s.color }}>{s.label}</p>
                <p className="text-xs font-bold text-gray-800">{s.total}</p>
                <p className={`text-[9px] font-semibold flex items-center justify-center gap-0.5 ${
                  s.growth > 0 ? 'text-emerald-600' : s.growth < 0 ? 'text-red-500' : 'text-gray-400'
                }`}>
                  {s.growth > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : s.growth < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                  {s.growth > 0 ? '+' : ''}{s.growth}%
                </p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl border border-gray-100 p-2" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {PRAYERS.map(p => (
                  <Area
                    key={p.key}
                    type="monotone"
                    dataKey={p.key}
                    name={p.label}
                    stroke={p.color}
                    fill={p.color}
                    fillOpacity={0.12}
                    strokeWidth={1.5}
                    dot={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-gray-400 text-center">
            {grandTotal} total attendance marks in the last {days} days · growth compares the second half of the window to the first
          </p>
        </>
      )}
    </div>
  );
};
