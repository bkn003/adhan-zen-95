import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Trash2, Edit2, Save, X, Plus, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { adminCall } from '@/utils/adminApi';

interface Props {
  locationId: string;
}

interface KhutbahForm {
  id?: string;
  title: string;
  speaker: string;
  body: string;
  event_at: string;
}

const empty: KhutbahForm = { title: '', speaker: '', body: '', event_at: '' };

/** Next Friday at 13:00 local, for the datetime-local default. */
const nextFriday = () => {
  const d = new Date();
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
  d.setHours(13, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const pretty = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

/**
 * Weekly Jummah khutbah-topic publisher. Posts appear in the user feed
 * (category "khutbah") for everyone following this mosque.
 */
export const KhutbahAdmin: React.FC<Props> = ({ locationId }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<KhutbahForm>({ ...empty, event_at: nextFriday() });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: khutbahs, isLoading } = useQuery({
    queryKey: ['khutbah-admin', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mosque_announcements')
        .select('id, title, body, event_at, created_at')
        .eq('location_id', locationId)
        .eq('category', 'khutbah')
        .order('event_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = async () => {
    if (!form.title.trim()) return toast.error('Enter the khutbah topic');
    if (!form.event_at) return toast.error('Pick the Jummah date/time');
    setBusy(true);
    try {
      const bodyText = form.speaker.trim()
        ? `Khateeb: ${form.speaker.trim()}\n\n${form.body.trim()}`
        : form.body.trim();
      await adminCall('upsert_announcement', {
        location_id: locationId,
        data: {
          id: form.id,
          title: form.title.trim(),
          body: bodyText || form.title.trim(),
          category: 'khutbah',
          event_at: new Date(form.event_at).toISOString(),
          allow_rsvp: false,
        },
      });
      toast.success(form.id ? 'Khutbah updated' : 'Khutbah published to followers');
      setForm({ ...empty, event_at: nextFriday() });
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['khutbah-admin', locationId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this khutbah post?')) return;
    try {
      await adminCall('delete_announcement', { location_id: locationId, data: { id } });
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['khutbah-admin', locationId] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const startEdit = (k: any) => {
    const speakerMatch = /^Khateeb: (.+?)(\n\n|$)/.exec(k.body ?? '');
    setForm({
      id: k.id,
      title: k.title,
      speaker: speakerMatch?.[1] ?? '',
      body: speakerMatch ? (k.body ?? '').slice(speakerMatch[0].length) : (k.body ?? ''),
      event_at: toInput(k.event_at),
    });
    setEditing(true);
  };

  return (
    <div className="space-y-3">
      <div className="bg-teal-50 rounded-xl border border-teal-200 p-3 space-y-2">
        <p className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" /> {editing ? 'Edit khutbah' : "This week's khutbah"}
        </p>
        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Khutbah topic (e.g. Patience in hardship)"
          className="w-full px-3 py-2 border border-teal-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
        <input
          value={form.speaker}
          onChange={e => setForm(f => ({ ...f, speaker: e.target.value }))}
          placeholder="Khateeb / speaker (optional)"
          className="w-full px-3 py-2 border border-teal-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
        <textarea
          value={form.body}
          onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          placeholder="Short summary or key points (optional)"
          rows={3}
          className="w-full px-3 py-2 border border-teal-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
        <div>
          <label className="text-[10px] font-semibold text-teal-700 uppercase">Jummah date & time</label>
          <input
            type="datetime-local"
            value={form.event_at}
            onChange={e => setForm(f => ({ ...f, event_at: e.target.value }))}
            className="mt-1 w-full px-3 py-2 border border-teal-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? <Save className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {editing ? 'Save changes' : 'Publish khutbah'}
          </button>
          {editing && (
            <button
              onClick={() => { setForm({ ...empty, event_at: nextFriday() }); setEditing(false); }}
              className="px-3 py-2.5 bg-white border border-teal-200 rounded-xl text-teal-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Recent khutbahs */}
      <div className="space-y-2">
        {isLoading && <p className="text-xs text-gray-400 text-center py-2">Loading…</p>}
        {!isLoading && (khutbahs ?? []).length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">No khutbah posts yet</p>
        )}
        {(khutbahs ?? []).map(k => (
          <div key={k.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{k.title}</p>
              <p className="text-[10px] text-teal-600 font-medium">{pretty(k.event_at)}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => startEdit(k)} className="p-1.5 bg-teal-50 rounded-lg">
                <Edit2 className="w-3.5 h-3.5 text-teal-600" />
              </button>
              <button onClick={() => remove(k.id)} className="p-1.5 bg-red-50 rounded-lg">
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 flex items-center gap-1">
        <Plus className="w-3 h-3" /> Published khutbahs appear in the Follow feed for everyone following this mosque.
      </p>
    </div>
  );
};
