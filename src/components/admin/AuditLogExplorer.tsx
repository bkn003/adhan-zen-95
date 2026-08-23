import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { History, Download, Filter, RotateCcw, Loader2, SearchX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getSupabaseFunctionsUrl } from '@/integrations/supabase/functions';
import { authHeaders } from '@/utils/adminApi';
import { cn } from '@/lib/utils';

interface AuditEntry {
  id: string;
  location_id: string;
  prayer_time_id: string | null;
  month: string | null;
  date_range: string | null;
  section: string;
  editor_label: string;
  actor_role: string;
  changes: Record<string, { old: string | null; new: string | null }>;
  status: string;
  rolled_back_at: string | null;
  created_at: string;
}

interface Props {
  /** Restrict the log to one mosque (mosque admin panel). */
  fixedLocationId?: string;
  /** Show per-entry rollback (requires timings permission on that mosque). */
  canRollback?: boolean;
  /** Dark theme (super admin panel). */
  dark?: boolean;
}

const SECTION_ORDER = ['timings', 'mosque_info', 'donations', 'announcements', 'photos', 'events', 'admin_permissions'];

const csvCell = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/**
 * Admin audit log explorer: who changed prayer times, mosque info, donation
 * settings and admin permissions — with mosque / section / date-range
 * filters, CSV export and (optionally) one-click rollback of timing edits.
 */
export const AuditLogExplorer: React.FC<Props> = ({ fixedLocationId, canRollback = false, dark = false }) => {
  const queryClient = useQueryClient();
  const [mosqueFilter, setMosqueFilter] = useState<string>(fixedLocationId ?? 'all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const { data: locations } = useQuery({
    queryKey: ['audit-locations'],
    enabled: !fixedLocationId,
    queryFn: async () => {
      const { data, error } = await supabase.from('locations').select('id, mosque_name, district').order('mosque_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['audit-log', fixedLocationId ?? 'all'],
    refetchInterval: 60_000,
    queryFn: async () => {
      let q = supabase
        .from('mosque_timing_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      if (fixedLocationId) q = q.eq('location_id', fixedLocationId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AuditEntry[];
    },
  });

  const locationName = useMemo(() => {
    const map = new Map<string, string>();
    (locations ?? []).forEach((l: any) => map.set(l.id, l.mosque_name));
    return map;
  }, [locations]);

  const sections = useMemo(() => {
    const found = new Set(entries.map((e) => e.section || 'timings'));
    return [...SECTION_ORDER.filter((s) => found.has(s)), ...[...found].filter((s) => !SECTION_ORDER.includes(s))];
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (mosqueFilter !== 'all' && e.location_id !== mosqueFilter) return false;
      if (sectionFilter !== 'all' && (e.section || 'timings') !== sectionFilter) return false;
      const day = e.created_at.slice(0, 10);
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;
      return true;
    });
  }, [entries, mosqueFilter, sectionFilter, fromDate, toDate]);

  const exportCsv = () => {
    const header = ['When', 'Mosque', 'Section', 'Scope', 'Editor', 'Role', 'Status', 'Changes'];
    const rows = filtered.map((e) => [
      new Date(e.created_at).toLocaleString(),
      locationName.get(e.location_id) ?? e.location_id,
      e.section || 'timings',
      e.month ? `${e.month} • ${e.date_range ?? ''}`.trim() : e.date_range ?? '',
      e.editor_label,
      e.actor_role,
      e.status,
      Object.entries(e.changes || {})
        .map(([k, v]) => `${k}: ${v?.old ?? '—'} → ${v?.new ?? '—'}`)
        .join('; '),
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mosque-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rollback = async (entry: AuditEntry) => {
    if (!canRollback) return;
    if (!window.confirm(`Roll back this change by ${entry.editor_label}? The previous values will be restored.`)) return;
    setBusy(entry.id);
    try {
      const res = await fetch(getSupabaseFunctionsUrl('mosque-admin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ action: 'rollback_timing_audit', audit_id: entry.id, location_id: entry.location_id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      queryClient.invalidateQueries({ queryKey: ['audit-log'] });
      queryClient.invalidateQueries({ queryKey: ['audit-trail'] });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Rollback failed');
    } finally {
      setBusy(null);
    }
  };

  const inputCls = dark
    ? 'bg-gray-900/50 border-gray-700/60 text-gray-200 text-xs rounded-lg px-2 py-1.5 border outline-none focus:border-emerald-500/60'
    : 'bg-white border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-1.5 border outline-none focus:border-emerald-400';
  const labelCls = dark ? 'text-gray-500' : 'text-gray-400';

  return (
    <div className={cn('rounded-2xl border p-4', dark ? 'bg-gray-800/60 border-gray-700/40' : 'bg-white border-gray-100 shadow-sm')}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className={cn('w-4 h-4', dark ? 'text-emerald-400' : 'text-emerald-600')} />
          <h3 className={cn('text-sm font-bold', dark ? 'text-gray-100' : 'text-gray-900')}>Audit Log</h3>
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500')}>
            {filtered.length}
          </span>
        </div>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-500 text-xs font-bold disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Filter className={cn('w-3.5 h-3.5 mb-2', labelCls)} />
        {!fixedLocationId && (
          <label className="flex flex-col gap-0.5">
            <span className={cn('text-[9px] font-bold uppercase tracking-wider', labelCls)}>Mosque</span>
            <select value={mosqueFilter} onChange={(e) => setMosqueFilter(e.target.value)} className={cn(inputCls, 'max-w-[150px]')}>
              <option value="all">All mosques</option>
              {(locations ?? []).map((l: any) => (
                <option key={l.id} value={l.id}>{l.mosque_name}</option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-0.5">
          <span className={cn('text-[9px] font-bold uppercase tracking-wider', labelCls)}>Section</span>
          <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className={inputCls}>
            <option value="all">All sections</option>
            {sections.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className={cn('text-[9px] font-bold uppercase tracking-wider', labelCls)}>From</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className={cn('text-[9px] font-bold uppercase tracking-wider', labelCls)}>To</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputCls} />
        </label>
        {(mosqueFilter !== 'all' || sectionFilter !== 'all' || fromDate || toDate) && (
          <button
            onClick={() => { setMosqueFilter(fixedLocationId ?? 'all'); setSectionFilter('all'); setFromDate(''); setToDate(''); }}
            className={cn('text-[10px] font-bold mb-1.5 underline', labelCls)}
          >
            Clear
          </button>
        )}
      </div>

      {/* Entries */}
      <div className="mt-3 space-y-2">
        {isLoading ? (
          <div className={cn('flex items-center justify-center gap-2 py-6 text-xs', labelCls)}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading audit log…
          </div>
        ) : filtered.length === 0 ? (
          <div className={cn('flex flex-col items-center gap-1 py-6 text-xs', labelCls)}>
            <SearchX className="w-5 h-5 opacity-50" />
            No matching changes found.
          </div>
        ) : (
          filtered.map((entry) => {
            const entriesList = Object.entries(entry.changes || {});
            return (
              <div key={entry.id} className={cn('rounded-xl border p-3', dark ? 'bg-gray-900/40 border-gray-700/40' : 'bg-gray-50/60 border-gray-100')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={cn('text-xs font-semibold flex flex-wrap items-center gap-1.5', dark ? 'text-gray-200' : 'text-gray-800')}>
                      {entry.editor_label}
                      <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase', entry.actor_role === 'super_admin' ? 'bg-purple-500/15 text-purple-500' : 'bg-blue-500/15 text-blue-500')}>
                        {entry.actor_role === 'super_admin' ? 'super admin' : 'mosque admin'}
                      </span>
                      <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', dark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600')}>
                        {(entry.section || 'timings').replace(/_/g, ' ')}
                      </span>
                    </p>
                    <p className={cn('text-[10px] mt-0.5', labelCls)}>
                      {!fixedLocationId && <span className="font-semibold">{locationName.get(entry.location_id) ?? 'Mosque'} • </span>}
                      {entry.month ? `${entry.month} • ${entry.date_range ?? ''}` : entry.date_range ?? ''}
                      {' • '}
                      {new Date(entry.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {entry.status === 'rolled_back' ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500">rolled back</span>
                    ) : canRollback && entry.section === 'timings' ? (
                      <button
                        onClick={() => void rollback(entry)}
                        disabled={busy === entry.id}
                        className="flex items-center gap-1 text-[10px] font-bold text-amber-500 disabled:opacity-40"
                      >
                        {busy === entry.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                        Rollback
                      </button>
                    ) : null}
                  </div>
                </div>
                {entriesList.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {entriesList.map(([field, c]) => (
                      <div key={field} className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className={cn('font-semibold', dark ? 'text-gray-400' : 'text-gray-500')}>{field.replace(/_/g, ' ')}</span>
                        <span className="line-through text-red-400">{c?.old ?? '—'}</span>
                        <span className={labelCls}>→</span>
                        <span className="text-emerald-500 font-semibold">{c?.new ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
