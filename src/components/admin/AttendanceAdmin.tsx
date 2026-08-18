import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, RefreshCw, CalendarDays, Phone, FileText, Sheet, PhoneOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jummah'] as const;
const LABELS: Record<string, string> = {
  fajr: 'Fajr', dhuhr: 'Zuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', jummah: 'Jummah',
};

interface RosterRow {
  prayer: string;
  user_id: string;
  display_name: string;
  phone: string | null;
  marked_at: string;
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const time12 = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

const prettyDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Mosque-admin view of who marked "I'm attending" for each jamaat, with mobile
 * number + one-tap call, and PDF / Excel exports carrying a proper header.
 */
export const AttendanceAdmin: React.FC<{ locationId: string; mosqueName?: string }> = ({
  locationId,
  mosqueName,
}) => {
  const [date, setDate] = React.useState(() => dayKey(new Date()));

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['attendance-roster', locationId, date],
    enabled: !!locationId && !!date,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_mosque_attendance_roster', {
        p_location_id: locationId,
        p_date: date,
      });
      if (error) throw error;
      return (data ?? []) as RosterRow[];
    },
  });

  const grouped = React.useMemo(() => {
    const map: Record<string, RosterRow[]> = {};
    (data ?? []).forEach((r) => {
      map[r.prayer] = map[r.prayer] ?? [];
      map[r.prayer].push(r);
    });
    return map;
  }, [data]);

  const total = data?.length ?? 0;
  const withPhone = (data ?? []).filter((r) => r.phone).length;
  const title = `Jamaat attendance — ${mosqueName || 'Mosque'}`;
  const rowsFor = (rows: RosterRow[], prayer: string) =>
    rows.map((r, i) => [
      String(i + 1),
      LABELS[prayer] ?? prayer,
      r.display_name,
      r.phone || '—',
      time12(r.marked_at),
    ]);

  const flatRows = React.useMemo(
    () => PRAYERS.filter((p) => grouped[p]?.length).flatMap((p) => rowsFor(grouped[p], p)),
    [grouped],
  );

  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const header = [
        [title],
        [`Date: ${prettyDate(date)}`],
        [`Total marked: ${total}   |   With mobile number: ${withPhone}`],
        [],
        ['#', 'Prayer', 'Name', 'Mobile', 'Marked at'],
      ];
      const ws = XLSX.utils.aoa_to_sheet([...header, ...flatRows]);
      ws['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 26 }, { wch: 16 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      XLSX.writeFile(wb, `jamaat-attendance-${date}.xlsx`);
    } catch {
      toast.error('Excel export failed');
    }
  };

  const exportPdf = async () => {
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(title, 14, 16);
      doc.setFontSize(10);
      doc.text(`Date: ${prettyDate(date)}`, 14, 23);
      doc.text(`Total marked: ${total}  |  With mobile number: ${withPhone}`, 14, 29);
      autoTable(doc, {
        startY: 34,
        head: [['#', 'Prayer', 'Name', 'Mobile', 'Marked at']],
        body: flatRows,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [16, 122, 87] },
      });
      doc.save(`jamaat-attendance-${date}.pdf`);
    } catch {
      toast.error('PDF export failed');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
          <CalendarDays className="w-3.5 h-3.5" />
          <input
            type="date"
            value={date}
            max={dayKey(new Date())}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
          />
        </label>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </button>
        <button
          onClick={exportPdf}
          disabled={!total}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 disabled:opacity-50"
        >
          <FileText className="w-3 h-3" /> PDF
        </button>
        <button
          onClick={exportExcel}
          disabled={!total}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 disabled:opacity-50"
        >
          <Sheet className="w-3 h-3" /> Excel
        </button>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
          <Users className="w-3.5 h-3.5" /> {total} marked
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-600">
          Could not load the attendance list. Only admins of this mosque can view it.
        </p>
      )}

      {isLoading ? (
        <p className="text-xs text-gray-400">Loading attendance…</p>
      ) : total === 0 ? (
        <p className="text-xs text-gray-500">No one marked attendance at this mosque on this day.</p>
      ) : (
        <div className="space-y-3">
          {PRAYERS.filter((p) => grouped[p]?.length).map((p) => (
            <div key={p} className="rounded-2xl border border-gray-100 bg-white p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-gray-800">{LABELS[p]}</p>
                <span className="text-[11px] font-semibold text-emerald-700">
                  {grouped[p].length} attended
                </span>
              </div>

              {/* Horizontal, swipeable people list — comfortable on phones */}
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 snap-x">
                {grouped[p].map((r) => (
                  <div
                    key={`${r.prayer}-${r.user_id}`}
                    className="snap-start shrink-0 w-40 rounded-xl border border-gray-100 bg-gray-50/60 p-2.5"
                  >
                    <p className="text-xs font-bold text-gray-800 truncate">{r.display_name}</p>
                    <p className="text-[11px] text-gray-500 tabular-nums">{time12(r.marked_at)}</p>
                    {r.phone ? (
                      <a
                        href={`tel:${r.phone}`}
                        className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-[11px] font-bold text-emerald-50"
                      >
                        <Phone className="w-3 h-3" /> {r.phone}
                      </a>
                    ) : (
                      <span className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-gray-100 px-2 py-1.5 text-[11px] font-semibold text-gray-400">
                        <PhoneOff className="w-3 h-3" /> No mobile
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-gray-400">
        Attendance is only markable within 300 m of the mosque, so this list reflects people who were
        present. Mobile numbers appear when the member added one to their account.
      </p>
    </div>
  );
};
