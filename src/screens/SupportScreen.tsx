import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, LifeBuoy, ImagePlus, Loader2, Send, Trash2, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocations } from '@/hooks/useLocations';

interface Ticket {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  admin_reply: string | null;
  screenshot_paths: string[];
  location_id: string | null;
  created_at: string;
}

const CATEGORIES = [
  { id: 'prayer_times', label: 'Wrong prayer times' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'mosque_info', label: 'Mosque info' },
  { id: 'app_bug', label: 'App bug / crash' },
  { id: 'suggestion', label: 'Suggestion' },
  { id: 'other', label: 'Other' },
];

const MAX_SHOTS = 3;

/** Downscale + re-encode a screenshot so uploads stay small on mobile data. */
async function compressImage(file: File, maxKb = 300): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  let quality = 0.85;
  let blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', quality));
  while (blob.size > maxKb * 1024 && quality > 0.35) {
    quality -= 0.12;
    blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', quality));
  }
  return blob;
}

const statusStyle = (status: string) =>
  status === 'resolved'
    ? { chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 }
    : status === 'in_progress'
      ? { chip: 'bg-sky-50 text-sky-700 border-sky-200', Icon: Loader2 }
      : { chip: 'bg-amber-50 text-amber-700 border-amber-200', Icon: Clock };

export const SupportScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { isSignedIn, user, openAuth } = useAuth();
  const { data: locations } = useLocations();
  const fileInput = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState('prayer_times');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState<string>(() => localStorage.getItem('selectedLocationId') || '');
  const [shots, setShots] = useState<{ file: Blob; preview: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [shotUrls, setShotUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('support_tickets')
      .select('id, category, subject, description, status, admin_reply, screenshot_paths, location_id, created_at')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) { toast.error('Could not load your reports'); return; }
    const rows = (data ?? []) as Ticket[];
    setTickets(rows);

    const paths = rows.flatMap((t) => t.screenshot_paths ?? []);
    if (paths.length) {
      const signed = await Promise.all(
        paths.map(async (p) => {
          const { data: s } = await supabase.storage.from('support-screenshots').createSignedUrl(p, 3600);
          return [p, s?.signedUrl] as const;
        }),
      );
      setShotUrls(Object.fromEntries(signed.filter(([, u]) => !!u) as [string, string][]));
    }
  }, [isSignedIn]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_SHOTS - shots.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (!picked.length) { toast.error(`Up to ${MAX_SHOTS} screenshots`); return; }
    const next = await Promise.all(
      picked.map(async (f) => {
        const blob = await compressImage(f);
        return { file: blob, preview: URL.createObjectURL(blob), name: f.name.replace(/\.[^.]+$/, '') };
      }),
    );
    setShots((s) => [...s, ...next]);
  };

  const submit = async () => {
    if (!isSignedIn || !user) { openAuth('Sign in to report an issue and track its progress.'); return; }
    if (subject.trim().length < 4) { toast.error('Add a short subject'); return; }
    if (description.trim().length < 10) { toast.error('Describe the problem in a bit more detail'); return; }

    setSubmitting(true);
    try {
      const paths: string[] = [];
      for (const [i, shot] of shots.entries()) {
        const path = `${user.id}/${Date.now()}-${i}.jpg`;
        const { error } = await supabase.storage
          .from('support-screenshots')
          .upload(path, shot.file, { contentType: 'image/jpeg', upsert: false });
        if (error) throw error;
        paths.push(path);
      }

      const { error } = await supabase.from('support_tickets').insert({
        user_id: user.id,
        location_id: locationId || null,
        category,
        subject: subject.trim(),
        description: description.trim(),
        screenshot_paths: paths,
      });
      if (error) throw error;

      toast.success('Report sent — we will follow up here');
      setSubject('');
      setDescription('');
      setShots([]);
      await loadTickets();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not send your report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 pb-28">
      <div className="flex items-center gap-2 bg-gradient-to-r from-slate-800 to-slate-600 px-3.5 py-3 shadow-md">
        <button onClick={onBack} className="p-1.5 bg-white/15 rounded-lg" aria-label="Back">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <LifeBuoy className="w-4 h-4 text-white" />
        <h2 className="text-base font-bold text-white">Support &amp; Issue Tracker</h2>
      </div>

      <div className="p-3 space-y-3">
        {!isSignedIn ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2 shadow-sm">
            <p className="text-sm font-bold text-gray-800">Sign in to report an issue</p>
            <p className="text-xs text-gray-500">
              Reports are tied to your account so you can attach screenshots, track the status and read our reply.
            </p>
            <button
              onClick={() => openAuth('Sign in to report an issue with screenshots.')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white text-sm font-bold"
            >
              Sign in / Create account
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 p-3 space-y-3 shadow-sm">
              <p className="text-sm font-bold text-gray-800">Report a problem</p>

              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                      category === c.id
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 bg-white"
              >
                <option value="">No specific mosque</option>
                {locations?.map((l) => (
                  <option key={l.id} value={l.id}>{l.mosque_name} — {l.district}</option>
                ))}
              </select>

              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject (e.g. Asr iqamah is 10 min late)"
                maxLength={120}
                className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2"
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What happened? What did you expect?"
                rows={4}
                maxLength={2000}
                className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2"
              />

              <div className="flex items-center gap-2 flex-wrap">
                {shots.map((s, i) => (
                  <div key={s.preview} className="relative">
                    <img src={s.preview} alt={`Screenshot ${i + 1}`} className="w-16 h-16 object-cover rounded-xl border border-gray-200" />
                    <button
                      onClick={() => setShots((all) => all.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 bg-white border border-gray-200 rounded-full p-1"
                      aria-label="Remove screenshot"
                    >
                      <Trash2 className="w-3 h-3 text-rose-500" />
                    </button>
                  </div>
                ))}
                {shots.length < MAX_SHOTS && (
                  <button
                    onClick={() => fileInput.current?.click()}
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400"
                  >
                    <ImagePlus className="w-4 h-4" />
                    <span className="text-[9px]">Add</span>
                  </button>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => void addFiles(e.target.files)}
                />
              </div>
              <p className="text-[11px] text-gray-400">
                Screenshots are compressed to ~300 KB and stored privately — only you and the app admin can open them.
              </p>

              <button
                onClick={() => void submit()}
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send report
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-bold text-gray-800">My reports</p>
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
              </div>

              {!loading && tickets.length === 0 && (
                <p className="text-xs text-gray-500 px-1">No reports yet. Anything you send appears here with its status.</p>
              )}

              {tickets.map((t) => {
                const { chip, Icon } = statusStyle(t.status);
                const mosque = locations?.find((l) => l.id === t.location_id)?.mosque_name;
                return (
                  <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{t.subject}</p>
                        <p className="text-[11px] text-gray-400">
                          {new Date(t.created_at).toLocaleString()}
                          {mosque ? ` • ${mosque}` : ''}
                        </p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${chip}`}>
                        <Icon className="w-3 h-3" />
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap">{t.description}</p>
                    {!!t.screenshot_paths?.length && (
                      <div className="flex gap-2">
                        {t.screenshot_paths.map((p) =>
                          shotUrls[p] ? (
                            <a key={p} href={shotUrls[p]} target="_blank" rel="noreferrer">
                              <img src={shotUrls[p]} alt="Report screenshot" className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                            </a>
                          ) : null,
                        )}
                      </div>
                    )}
                    {t.admin_reply && (
                      <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Reply</p>
                        <p className="text-xs text-emerald-800">{t.admin_reply}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
