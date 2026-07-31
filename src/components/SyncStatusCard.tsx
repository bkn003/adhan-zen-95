import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, WifiOff, ChevronRight, CloudDownload } from 'lucide-react';
import { getSyncState, subscribeSyncState, runPrayerSync, formatRelative, type SyncState } from '@/native/syncEngine';

export const SyncStatusCard: React.FC = () => {
  const [state, setState] = useState<SyncState>(() => getSyncState());

  useEffect(() => subscribeSyncState(setState), []);
  useEffect(() => {
    const iv = setInterval(() => setState(getSyncState()), 30_000);
    return () => clearInterval(iv);
  }, []);

  const busy = state.status === 'syncing';

  const badge = (() => {
    switch (state.status) {
      case 'syncing': return { icon: RefreshCw, text: 'Syncing…', cls: 'text-sky-600 bg-sky-50 border-sky-200' };
      case 'error': return { icon: AlertTriangle, text: 'Sync failed', cls: 'text-red-600 bg-red-50 border-red-200' };
      case 'offline': return { icon: WifiOff, text: 'Offline', cls: 'text-amber-600 bg-amber-50 border-amber-200' };
      case 'success': return { icon: CheckCircle2, text: 'Up to date', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
      default: return { icon: CloudDownload, text: 'Not synced yet', cls: 'text-gray-500 bg-gray-50 border-gray-200' };
    }
  })();
  const BadgeIcon = badge.icon;

  return (
    <div className="space-y-2">
      <div className="p-3 bg-white rounded-xl border border-gray-100">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {state.mosqueName || 'No mosque selected'}
            </p>
            <p className="text-xs text-gray-500">
              Last sync: <span className="font-medium text-gray-700">{formatRelative(state.lastSyncAt)}</span>
            </p>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold ${badge.cls}`}>
            <BadgeIcon className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
            {badge.text}
          </span>
        </div>
        {state.error && state.status === 'error' && (
          <p className="mt-2 text-[11px] text-red-500 truncate">{state.error}</p>
        )}
      </div>

      <button
        onClick={() => void runPrayerSync()}
        disabled={busy}
        className="w-full py-2.5 px-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
        {busy ? 'Syncing…' : 'Sync now'}
      </button>

      <button
        onClick={() => window.dispatchEvent(new CustomEvent('navigate-sync-changes'))}
        className="w-full py-2.5 px-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          🔔 Recent time changes
          {state.changes.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px]">{state.changes.length}</span>
          )}
        </span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
