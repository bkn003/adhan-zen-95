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

/** 12-hour AM/PM label for a HH:MM[:SS] database time. */
const hm = (t?: string | null) => {
  if (!t) return '—';
  const [hStr, mStr] = t.split(':');
  const h = Number(hStr);
  if (!Number.isFinite(h)) return '—';
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${(mStr ?? '00').padStart(2, '0')} ${period}`;
};

/**
 * Human date-range label for a stored `date_range` value, which may carry a
 * month suffix ("1-5 Apr", "24-31 Aug"). Always snaps to the canonical
 * schedule buckets 1-5, 6-11, 12-17, 18-23, 24-<month end>.
 */
export const rangeLabel = (dateRange: string, monthIndex: number, year: number) => {
  const monthEnd = new Date(year, monthIndex + 1, 0).getDate();
  const m = String(dateRange || '').match(/(\d{1,2})\s*[-–]\s*(\d{1,2})/);
  if (!m) return String(dateRange || '');
  const from = parseInt(m[1], 10);
  const canonical: Record<number, number> = { 1: 5, 6: 11, 12: 17, 18: 23 };
  const to = from >= 24 ? monthEnd : Math.min(canonical[from] ?? parseInt(m[2], 10), monthEnd);
  return `${from}-${to}`;
};


/** Canonical from/to days for a stored `date_range`, clamped to the month end. */
export const rangeDays = (dateRange: string, monthIndex: number, year: number) => {
  const label = rangeLabel(dateRange, monthIndex, year);
  const m = label.match(/(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  return { from: parseInt(m[1], 10), to: parseInt(m[2], 10) };
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

  doc.setFontSize(14);
  const pageWidth = doc.internal.pageSize.getWidth();
  const titleLines = doc.splitTextToSize(`${meta.mosqueName} — ${meta.month} ${meta.year}`, pageWidth - 80);
  doc.text(titleLines, 40, 40);
  doc.setFontSize(10);
  const sub = [meta.district, meta.hijriLabel ? `Hijri: ${meta.hijriLabel}` : null, meta.isRamadan ? 'Ramadan timings included' : null]
    .filter(Boolean)
    .join('  •  ');
  const subY = 40 + titleLines.length * 16;
  if (sub) doc.text(doc.splitTextToSize(sub, pageWidth - 80), 40, subY);

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
    startY: subY + 18,
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [16, 122, 87], textColor: 255, fontSize: 8 },
    alternateRowStyles: { fillColor: [240, 250, 245] },
    margin: { left: 30, right: 30 },
    tableWidth: 'auto',
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
    const days = rangeDays(r.date_range, meta.monthIndex, meta.year);
    if (!days) return;
    const { from, to } = days;

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

export interface EidTiming {
  label: string;
  /** ISO date (yyyy-mm-dd) when known. */
  date?: string | null;
  /** HH:MM time of the jamaat. */
  time?: string | null;
  note?: string | null;
}

interface RamadanMeta extends Meta {
  eid?: EidTiming[];
}

/** Ramadan-only schedule: fasting (sahar/iftar), taraweeh and Eid jamaat times. */
export function exportRamadanPdf(rows: ExportRow[], meta: RamadanMeta) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  doc.setFontSize(16);
  doc.text(`${meta.mosqueName} — Ramadan ${meta.year}`, 40, 40);
  doc.setFontSize(10);
  const sub = [meta.district, `${meta.month} ${meta.year}`, meta.hijriLabel ? `Hijri: ${meta.hijriLabel}` : null]
    .filter(Boolean)
    .join('  •  ');
  if (sub) doc.text(sub, 40, 58);

  autoTable(doc, {
    head: [['Dates', 'Sahar ends', 'Fajr Jamaat', 'Iftar (Maghrib)', 'Isha Jamaat', 'Taraweeh']],
    body: rows.map((r) => [
      `${rangeLabel(r.date_range, meta.monthIndex, meta.year)} ${meta.month}`,
      hm(r.sahar_end),
      hm(r.fajr_ramadan_iqamah || r.fajr_iqamah),
      hm(r.ifthar_time || r.maghrib_adhan),
      hm(r.isha_ramadan_iqamah || r.isha_iqamah),
      hm(r.tharaweeh),
    ]),
    startY: 72,
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [124, 58, 237], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 243, 255] },
  });

  if (meta.eid?.length) {
    const y = (doc as any).lastAutoTable?.finalY ?? 100;
    doc.setFontSize(12);
    doc.text('Eid timings', 40, y + 28);
    autoTable(doc, {
      head: [['Prayer', 'Date', 'Jamaat', 'Note']],
      body: meta.eid.map((e) => [e.label, e.date ?? '—', hm(e.time), e.note ?? '—']),
      startY: y + 38,
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [16, 122, 87], textColor: 255 },
    });
  }

  doc.setFontSize(8);
  doc.text(
    `Generated ${new Date().toLocaleString()} — Adhan Zen. Times set by the mosque admin.`,
    40,
    doc.internal.pageSize.getHeight() - 20,
  );

  doc.save(`${meta.mosqueName.replace(/\s+/g, '_')}_Ramadan_${meta.year}.pdf`);
}

/** Ramadan calendar (.ics): sahar end, iftar, taraweeh per day plus Eid jamaat. */
export function exportRamadanIcs(rows: ExportRow[], meta: RamadanMeta) {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Adhan Zen//Ramadan Schedule//EN',
    'CALSCALE:GREGORIAN',
  ];
  const monthEnd = new Date(meta.year, meta.monthIndex + 1, 0).getDate();

  const push = (name: string, start: Date, minutes = 20) => {
    const end = new Date(start.getTime() + minutes * 60 * 1000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${meta.mosqueName}-${name}-${icsStamp(start)}@adhanzen`.replace(/\s+/g, '_'),
      `DTSTAMP:${icsStamp(new Date())}`,
      `DTSTART:${icsStamp(start)}`,
      `DTEND:${icsStamp(end)}`,
      `SUMMARY:${esc(`${name} — ${meta.mosqueName}`)}`,
      `DESCRIPTION:${esc(`Ramadan ${meta.year} at ${meta.mosqueName}${meta.district ? `, ${meta.district}` : ''}`)}`,
      'END:VEVENT',
    );
  };

  rows.forEach((r) => {
    const days = rangeDays(r.date_range, meta.monthIndex, meta.year);
    if (!days) return;
    const { from, to } = days;
    for (let day = from; day <= to; day++) {
      ([
        ['Sahar ends (start fasting)', r.sahar_end, 5],
        ['Iftar (break fast)', r.ifthar_time || r.maghrib_adhan, 15],
        ['Taraweeh', r.tharaweeh, 60],
      ] as [string, string | null | undefined, number][]).forEach(([name, time, mins]) => {
        if (!time) return;
        const [h, m] = time.split(':').map(Number);
        push(name, new Date(meta.year, meta.monthIndex, day, h || 0, m || 0), mins);
      });
    }
  });

  meta.eid?.forEach((e) => {
    if (!e.time || !e.date) return;
    const [y, mo, d] = e.date.split('-').map(Number);
    const [h, m] = e.time.split(':').map(Number);
    push(e.label, new Date(y, (mo || 1) - 1, d || 1, h || 0, m || 0), 60);
  });

  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${meta.mosqueName.replace(/\s+/g, '_')}_Ramadan_${meta.year}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
