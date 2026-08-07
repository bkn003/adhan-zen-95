import React from 'react';
import { ArrowLeft, ShieldCheck, Database, Clock, Info, Lock, History, Cloud } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocations } from '@/hooks/useLocations';
import { SyncStatusCard } from '@/components/SyncStatusCard';
import { AuditTrail } from '@/components/admin/AuditTrail';

interface Props {
  onBack: () => void;
}

const RULES: { title: string; body: string }[] = [
  {
    title: 'Mosque-published timings first',
    body: 'Adhan and jamaat (iqamah) times come from the mosque admin of your selected mosque — never from a generic calculation. What you see is what the mosque published.',
  },
  {
    title: 'Weekly date ranges',
    body: 'Each month is split into fixed ranges: 1-5, 6-11, 12-17, 18-23 and 24 to month end (28, 29, 30 or 31 depending on the month).',
  },
  {
    title: 'Astronomical times',
    body: 'Sunrise, mid-noon, sunset, Ishraq and Tahajjud windows are derived from the mosque coordinates and the published times, so they stay consistent with your local horizon.',
  },
  {
    title: 'Hijri date',
    body: 'The Hijri date uses the Aladhan calendar with an optional day adjustment applied by the app maintainer for local moon sighting.',
  },
  {
    title: 'Offline behaviour',
    body: 'Timings are cached on your device. If you are offline, the last synced schedule is used and the sync card above shows when it was fetched.',
  },
];

export const TransparencyScreen: React.FC<Props> = ({ onBack }) => {
  const { isSignedIn, requireAuth } = useAuth();
  const { data: locations = [] } = useLocations();

  const selectedId = localStorage.getItem('selectedLocationId');
  const mohallaId = localStorage.getItem('myMohallaId');
  const auditId = selectedId || mohallaId;
  const auditMosque = locations.find((l) => l.id === auditId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 pb-28">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-3 py-2.5 flex items-center gap-2">
        <button onClick={onBack} className="p-1.5 rounded-lg active:scale-95">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-gray-900 truncate">Accuracy &amp; Transparency</h1>
          <p className="text-[11px] text-gray-500 truncate">Where your prayer times come from</p>
        </div>
      </div>

      <div className="p-3 space-y-4 max-w-md mx-auto">
        {/* Source */}
        <section className="space-y-2">
          <p className="px-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
            <Database className="w-3 h-3" /> Data source
          </p>
          <div className="rounded-2xl border border-gray-100 bg-white p-3 space-y-2">
            <p className="text-sm text-gray-700">
              Timings are published by each mosque's own admin, stored centrally, then delivered to
              your device through a global cache so the app stays fast and works offline.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              <Cloud className="w-3.5 h-3.5 shrink-0" />
              Mosque admin → central database → CDN snapshot → your device cache
            </div>
          </div>
        </section>

        {/* Last sync */}
        <section className="space-y-2">
          <p className="px-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
            <Clock className="w-3 h-3" /> Last sync
          </p>
          <SyncStatusCard />
        </section>

        {/* Calculation rules */}
        <section className="space-y-2">
          <p className="px-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
            <Info className="w-3 h-3" /> How times are decided
          </p>
          <div className="rounded-2xl border border-gray-100 bg-white divide-y divide-gray-50">
            {RULES.map((r) => (
              <div key={r.title} className="p-3">
                <p className="text-sm font-semibold text-gray-800">{r.title}</p>
                <p className="mt-0.5 text-[12px] text-gray-600 leading-relaxed">{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Edit history */}
        <section className="space-y-2">
          <p className="px-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
            <History className="w-3 h-3" /> Edit history
            {auditMosque ? ` · ${auditMosque.mosque_name}` : ''}
          </p>

          {!isSignedIn ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-center space-y-2">
              <Lock className="w-5 h-5 mx-auto text-emerald-600" />
              <p className="text-sm font-semibold text-gray-800">Sign in to view the audit trail</p>
              <p className="text-[11px] text-gray-600">
                The full record of who edited a timing and when is shown to signed-in users to keep it
                accountable.
              </p>
              <button
                onClick={() => requireAuth('View the mosque timing audit trail')}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold active:scale-[0.99]"
              >
                Sign in
              </button>
            </div>
          ) : auditId ? (
            <AuditTrail locationId={auditId} limit={25} />
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center text-sm text-gray-500">
              Select a mosque to see its edit history.
            </div>
          )}
        </section>

        <p className="px-1 text-[11px] text-gray-400 flex items-start gap-1">
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Every timing edit is logged with the admin identity and can be rolled back by that mosque's
          admin. Please confirm critical times with your mosque before relying on them.
        </p>
      </div>
    </div>
  );
};
