import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportRow {
  date_range: string;
  fajr_adhan?: string | null;
  fajr_iqamah?: string | null;
  fajr_ramadan_iqamah?: string | null;
  dhuhr_adhan?: string | null;
  dhuhr_iqamah?: string | null;
  asr_adhan?: string | null;
  asr_iqamah?: string | null;
  maghrib_adhan?: string | null;
  maghrib_iqamah?: string | null;
  maghrib_ramadan_iqamah?: string | null;
  isha_adhan?: string | null;
  isha_iqamah?: string | null;
  isha_ramadan_iqamah?: string | null;
  sahar_end?: string | null;
  ifthar_time?: string | null;
  tharaweeh?: string | null;
}

const hm = (t?: string | null) => (t ? t.slice(0, 5) : '—');

/** Human date-range label, clamped to the real month end (e.g. Feb 24-28). */
export const rangeLabel = (dateRange: string, monthIndex: number, year: number) => {
  const end = new Date(year, monthIndex + 1, 0).getDate();
  const [from, to] = dateRange.split('-');
  const toNum = Number(to);
  if (!to || !Number.isFinite(toNum) || toNum > end) return `${from}-${end}`;
  return `${from}-${to}`;
};

interface Meta {
  mosqueName: string;
  district?: string;
  month: string;
  monthIndex: number;
  year: number;
  isRamadan: boolean;
  hijriLabel?: string;
}

/** Monthly prayer-time schedule as a PDF (includes Hijri header + Ramadan rows). */
export function exportSchedulePdf(rows: ExportRow[], meta: Meta) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFontSize(16);
  doc.text(`${meta.mosqueName} — ${meta.month} ${meta.year}`, 40, 40);
  doc.setFontSize(10);
  const sub = [meta.district, meta.hijriLabel ? `Hijri: ${meta.hijriLabel}` : null, meta.isRamadan ? 'Ramadan timings included' : null]
    .filter(Boolean)
    .join('  •  ');
  if (sub) doc.text(sub, 40, 58);

  const head = [[
    'Dates', 'Fajr Adhan', 'Fajr Jamaat', 'Zuhr Adhan', 'Zuhr Jamaat',
    'Asr Adhan', 'Asr Jamaat', 'Maghrib', 'Isha Adhan', 'Isha Jamaat',
    ...(meta.isRamadan ? ['Sahar end', 'Iftar', 'Taraweeh'] : []),
  ]];

  const body = rows.map((r) => [
    `${rangeLabel(r.date_range, meta.monthIndex, meta.year)} ${meta.month}`,
    hm(r.fajr_adhan),
    hm(meta.isRamadan && r.fajr_ramadan_iqamah ? r.fajr_ramadan_iqamah : r.fajr_iqamah),
    hm(r.dhuhr_adhan),
    hm(r.dhuhr_iqamah),
    hm(r.asr_adhan),
    hm(r.asr_iqamah),
    hm(meta.isRamadan && r.maghrib_ramadan_iqamah ? r.maghrib_ramadan_iqamah : r.maghrib_iqamah),
    hm(r.isha_adhan),
    hm(meta.isRamadan && r.isha_ramadan_iqamah ? r.isha_ramadan_iqamah : r.isha_iqamah),
    ...(meta.isRamadan ? [hm(r.sahar_end), hm(r.ifthar_time), hm(r.tharaweeh)] : []),
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 72,
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [16, 122, 87], textColor: 255 },
    alternateRowStyles: { fillColor: [240, 250, 245] },
  });

  doc.setFontSize(8);
  doc.text(
    `Generated ${new Date().toLocaleString()} — Adhan Zen. Times set by the mosque admin.`,
    40,
    doc.internal.pageSize.getHeight() - 20,
  );

  doc.save(`${meta.mosqueName.replace(/\s+/g, '_')}_${meta.month}_${meta.year}.pdf`);
}

const icsStamp = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(
    d.getHours(),
  ).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;

const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

/** Monthly jamaat times as an .ics calendar (one event per prayer per day). */
export function exportScheduleIcs(rows: ExportRow[], meta: Meta) {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Adhan Zen//Prayer Times//EN',
    'CALSCALE:GREGORIAN',
  ];

  const monthEnd = new Date(meta.year, meta.monthIndex + 1, 0).getDate();

  const prayers = (r: ExportRow): { name: string; time?: string | null }[] => [
    { name: 'Fajr', time: meta.isRamadan && r.fajr_ramadan_iqamah ? r.fajr_ramadan_iqamah : r.fajr_iqamah },
    { name: 'Zuhr', time: r.dhuhr_iqamah },
    { name: 'Asr', time: r.asr_iqamah },
    { name: 'Maghrib', time: meta.isRamadan && r.maghrib_ramadan_iqamah ? r.maghrib_ramadan_iqamah : r.maghrib_iqamah },
    { name: 'Isha', time: meta.isRamadan && r.isha_ramadan_iqamah ? r.isha_ramadan_iqamah : r.isha_iqamah },
    ...(meta.isRamadan
      ? [
          { name: 'Sahar ends', time: r.sahar_end },
          { name: 'Iftar', time: r.ifthar_time },
          { name: 'Taraweeh', time: r.tharaweeh },
        ]
      : []),
  ];

  rows.forEach((r) => {
    const [fromStr, toStr] = r.date_range.split('-');
    const from = Number(fromStr);
    const to = Math.min(Number(toStr) || monthEnd, monthEnd);
    if (!Number.isFinite(from)) return;

    for (let day = from; day <= to; day++) {
      prayers(r).forEach(({ name, time }) => {
        if (!time) return;
        const [h, m] = time.split(':').map(Number);
        const start = new Date(meta.year, meta.monthIndex, day, h || 0, m || 0);
        const end = new Date(start.getTime() + 20 * 60 * 1000);
        lines.push(
          'BEGIN:VEVENT',
          `UID:${meta.mosqueName}-${name}-${icsStamp(start)}@adhanzen`.replace(/\s+/g, '_'),
          `DTSTAMP:${icsStamp(new Date())}`,
          `DTSTART:${icsStamp(start)}`,
          `DTEND:${icsStamp(end)}`,
          `SUMMARY:${esc(`${name} — ${meta.mosqueName}`)}`,
          `DESCRIPTION:${esc(
            `${name} jamaat at ${meta.mosqueName}${meta.district ? `, ${meta.district}` : ''}${
              meta.hijriLabel ? ` (Hijri ${meta.hijriLabel})` : ''
            }`,
          )}`,
          'END:VEVENT',
        );
      });
    }
  });

  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${meta.mosqueName.replace(/\s+/g, '_')}_${meta.month}_${meta.year}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
