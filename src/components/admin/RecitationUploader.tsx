import React, { useCallback, useEffect, useState } from 'react';
import { Mic, Upload, Trash2, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { QURAN_LANGUAGES } from '@/utils/quranEditions';
import { HADITH_BOOKS } from '@/utils/hadithSources';
import {
  listRecitations, uploadRecitation, deleteRecitation, getRecitationUrls,
  type RecitationKind, type RecitationRow,
} from '@/utils/humanReciters';

/** Languages offered for hadith recordings (dataset language codes). */
const HADITH_LANGS = [
  { code: 'ara', label: 'Arabic' },
  { code: 'eng', label: 'English' },
  { code: 'tam', label: 'Tamil' },
  { code: 'urd', label: 'Urdu' },
  { code: 'ben', label: 'Bengali' },
];

/**
 * Super-admin only: upload one audio file per verse (or per hadith) so the
 * reader plays a real reciter instead of a generated voice.
 */
export const RecitationUploader: React.FC = () => {
  const [kind, setKind] = useState<RecitationKind>('quran');
  const [langCode, setLangCode] = useState('ta');
  const [ref1, setRef1] = useState(1);
  const [startRef2, setStartRef2] = useState(1);
  const [reciterName, setReciterName] = useState('');
  const [rows, setRows] = useState<RecitationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');

  const langs = kind === 'quran'
    ? QURAN_LANGUAGES.map((l) => ({ code: l.code, label: l.englishLabel }))
    : HADITH_LANGS;

  useEffect(() => {
    setLangCode(kind === 'quran' ? 'ta' : 'ara');
  }, [kind]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listRecitations(kind, langCode, ref1));
    } finally {
      setLoading(false);
    }
  }, [kind, langCode, ref1]);

  useEffect(() => { refresh(); }, [refresh]);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    setBusy(true);
    let done = 0;
    try {
      for (let i = 0; i < list.length; i++) {
        setProgress(`Uploading ${i + 1} of ${list.length}…`);
        await uploadRecitation({
          kind,
          langCode,
          ref1,
          ref2: startRef2 + i,
          file: list[i],
          reciterName,
        });
        done++;
      }
      toast.success(`${done} recording${done === 1 ? '' : 's'} uploaded`);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const onDelete = async (row: RecitationRow) => {
    try {
      await deleteRecitation(row);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      toast.success('Recording removed');
    } catch (e: any) {
      toast.error(e?.message || 'Could not remove');
    }
  };

  const onPreview = async (row: RecitationRow) => {
    const urls = await getRecitationUrls(kind, langCode, ref1);
    const src = urls[row.ref2];
    if (!src) { toast.error('Could not open this recording'); return; }
    new Audio(src).play().catch(() => toast.error('Playback failed'));
  };

  const numLabel = kind === 'quran' ? 'Surah' : 'Book number';
  const itemLabel = kind === 'quran' ? 'First ayah number' : 'First hadith number';

  return (
    <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/40 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center">
          <Mic className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Reciter recordings</p>
          <p className="text-[10px] text-gray-500">One audio file per verse. Uploaded files play instead of the generated voice.</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-700/30 rounded-xl p-1">
        {(['quran', 'hadith'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`flex-1 py-2 rounded-lg text-[11px] font-semibold capitalize ${
              kind === k ? 'bg-teal-500 text-white' : 'text-gray-400'
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Language</span>
          <select
            value={langCode}
            onChange={(e) => setLangCode(e.target.value)}
            className="w-full bg-gray-700/40 border border-gray-600/40 rounded-xl px-3 py-2 text-xs text-white"
          >
            {langs.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">{numLabel}</span>
          {kind === 'hadith' ? (
            <select
              value={ref1}
              onChange={(e) => setRef1(Number(e.target.value))}
              className="w-full bg-gray-700/40 border border-gray-600/40 rounded-xl px-3 py-2 text-xs text-white"
            >
              {HADITH_BOOKS.map((b, i) => (
                <option key={b.id} value={i + 1}>{b.title}</option>
              ))}
            </select>
          ) : (
            <input
              type="number" min={1}
              value={ref1}
              onChange={(e) => setRef1(Math.max(1, Number(e.target.value) || 1))}
              className="w-full bg-gray-700/40 border border-gray-600/40 rounded-xl px-3 py-2 text-xs text-white"
            />
          )}
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">{itemLabel}</span>
          <input
            type="number" min={1}
            value={startRef2}
            onChange={(e) => setStartRef2(Math.max(1, Number(e.target.value) || 1))}
            className="w-full bg-gray-700/40 border border-gray-600/40 rounded-xl px-3 py-2 text-xs text-white"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Reciter name</span>
          <input
            value={reciterName}
            onChange={(e) => setReciterName(e.target.value)}
            placeholder="Optional"
            className="w-full bg-gray-700/40 border border-gray-600/40 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500"
          />
        </label>
      </div>

      <label className={`flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-teal-500/40 bg-teal-500/10 text-xs font-semibold text-teal-300 ${busy ? 'opacity-60' : 'cursor-pointer'}`}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {busy ? (progress || 'Uploading…') : 'Choose audio files'}
        <input
          type="file" accept="audio/*" multiple hidden disabled={busy}
          onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ''; }}
        />
      </label>
      <p className="text-[10px] text-gray-500">
        Files are numbered in name order, starting from the number above — so 001.mp3, 002.mp3 … land on the right verses.
      </p>

      <div className="space-y-1">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">
          Uploaded {loading ? '' : `(${rows.length})`}
        </p>
        {loading ? (
          <div className="py-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-gray-500" /></div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-gray-500 py-2">Nothing uploaded here yet.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-gray-700/30 rounded-xl px-3 py-2">
                <span className="text-xs text-white">
                  {kind === 'quran' ? `Ayah ${r.ref2}` : `Hadith ${r.ref2}`}
                  {r.reciter_name ? <span className="text-gray-500"> · {r.reciter_name}</span> : null}
                </span>
                <span className="flex items-center gap-1">
                  <button onClick={() => onPreview(r)} className="p-1.5 bg-teal-500/15 rounded-lg">
                    <Play className="w-3.5 h-3.5 text-teal-300" />
                  </button>
                  <button onClick={() => onDelete(r)} className="p-1.5 bg-red-500/15 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5 text-red-300" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
