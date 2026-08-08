import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { History, RotateCcw, ShieldCheck, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';
import { authHeaders } from '@/utils/adminApi';
import { supabase } from '@/integrations/supabase/client';
import { PrayerTimeDiff } from '@/components/PrayerTimeDiff';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export interface AuditChange {
  field: string;
  old_value: string | null;
  new_value: string | null;
}

export interface AuditEntry {
  id: string;
  location_id: string;
  prayer_time_id: string | null;
  month: string | null;
  date_range: string | null;
  editor_label: string;
  actor_role: string;
  changes: AuditChange[];
  status: string;
  rolled_back_at: string | null;
  created_at: string;
}

const prettyField = (f: string) =>
  f
    .replace(/_/g, ' ')
    .replace(/\bdhuhr\b/i, 'Zuhr')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

export const useTimingAudit = (locationId?: string | null, limit = 40) =>
  useQuery({
    queryKey: ['timing-audit', locationId, limit],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mosque_timing_audit')
        .select('*')
        .eq('location_id', locationId!)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as AuditEntry[];
    },
  });

interface Props {
  locationId: string;
  /** Enables the rollback action for signed-in admins. */
  canRollback?: boolean;
  limit?: number;
}

/** Who changed which timing, when — with an optional one-tap rollback. */
export const AuditTrail: React.FC<Props> = ({ locationId, canRollback = false, limit = 40 }) => {
  const { data: entries = [], isLoading } = useTimingAudit(locationId, limit);
  const [busyId, setBusyId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const rollback = async (entry: AuditEntry) => {
    if (!canRollback) return;
    setBusyId(entry.id);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          action: 'rollback_timing_audit',
          location_id: locationId,
          data: { audit_id: entry.id },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Rollback failed');
      toast.success('Change rolled back');
      queryClient.invalidateQueries({ queryKey: ['timing-audit'] });
      queryClient.invalidateQueries({ queryKey: ['prayer-times'], refetchType: 'all' });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading edit history…
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="p-4 rounded-xl border border-gray-100 bg-white text-center">
        <History className="w-5 h-5 mx-auto text-gray-300" />
        <p className="mt-1 text-sm text-gray-500">No timing edits recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const rolledBack = entry.status === 'rolled_back';
        return (
          <div
            key={entry.id}
            className={`rounded-2xl border bg-white overflow-hidden ${
              rolledBack ? 'border-amber-200' : 'border-gray-100'
            }`}
          >
            <div className="flex items-start justify-between gap-2 px-3 py-2.5 bg-gray-50/70 border-b border-gray-100">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">
                  {entry.month || '—'} · {entry.date_range || 'all dates'}
                </p>
                <p className="text-[11px] text-gray-500 flex items-center gap-1 truncate">
                  <User className="w-3 h-3 shrink-0" />
                  {entry.editor_label} ({entry.actor_role.replace(/_/g, ' ')}) · {when(entry.created_at)}
                </p>
              </div>
              <span
                className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  rolledBack
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {rolledBack ? 'Rolled back' : entry.status === 'created' ? 'Created' : 'Approved'}
              </span>
            </div>

            <div className="divide-y divide-gray-50">
              {(entry.changes || []).map((c, i) => (
                <PrayerTimeDiff
                  key={`${entry.id}-${c.field}-${i}`}
                  label={prettyField(c.field)}
                  from={c.old_value}
                  to={c.new_value}
                  compact
                  showImpact={false}
                />
              ))}
            </div>

            {canRollback && !rolledBack && entry.prayer_time_id && (
              <button
                onClick={() => rollback(entry)}
                disabled={busyId === entry.id}
                className="w-full py-2.5 text-xs font-bold text-gray-700 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-1.5 active:scale-[0.99] disabled:opacity-60"
              >
                {busyId === entry.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                Roll back this change
              </button>
            )}
            {rolledBack && (
              <p className="px-3 py-2 text-[11px] text-amber-700 bg-amber-50/60 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Reverted
                {entry.rolled_back_at ? ` on ${when(entry.rolled_back_at)}` : ''}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
