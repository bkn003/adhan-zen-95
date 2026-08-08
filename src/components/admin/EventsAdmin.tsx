import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Save, X, Calendar , Send } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  locationId: string;
}

const CATEGORIES = ['announcement', 'event', 'lecture', 'fundraiser', 'eid'];

interface Form {
  id?: string;
  title: string;
  body: string;
  category: string;
  event_at: string;
  end_at: string;
  location_note: string;
  allow_rsvp: boolean;
}

const empty: Form = { title: '', body: '', category: 'announcement', event_at: '', end_at: '', location_note: '', allow_rsvp: false };

const toInput = (iso?: string | null) => iso ? new Date(iso).toISOString().slice(0, 16) : '';
const fromInput = (v: string) => v ? new Date(v).toISOString() : null;

export const EventsAdmin: React.FC<Props> = ({ locationId }) => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Form | null>(null);

  const { data: events } = useQuery({
    queryKey: ['admin-mosque-events', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mosque_announcements')
        .select('*')
        .eq('location_id', locationId)
        .order('event_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim()) return toast.error('Title required');
    const fields: any = {
      title: editing.title.trim(),
      body: editing.body.trim(),
      category: editing.category,
      event_at: fromInput(editing.event_at),
      end_at: fromInput(editing.end_at),
      location_note: editing.location_note.trim() || null,
      allow_rsvp: editing.allow_rsvp,
    };
    if (editing.id) fields.id = editing.id;
    try {
      const { data, error } = await supabase.functions.invoke('mosque-admin', {
        body: { action: 'upsert_announcement', location_id: locationId, data: fields },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success(editing.id ? 'Event updated' : 'Event published');
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['admin-mosque-events', locationId] });
      qc.invalidateQueries({ queryKey: ['mosque-events', locationId] });
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    }
  };

  const sendPush = async (e: any) => {
    if (!confirm(`Send a push notification about "${e.title}" to followers?`)) return;
    try {
      const { data, error } = await supabase.functions.invoke('mosque-admin', {
        body: {
          action: 'send_announcement_push',
          location_id: locationId,
          data: { title: e.title, body: e.body || e.title, announcement_id: e.id },
        },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      const sent = (data as any)?.sent ?? 0;
      toast.success(sent ? `Push sent to ${sent} device(s)` : 'No registered devices yet');
    } catch (err: any) {
      toast.error(err.message || 'Push failed');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      const { data, error } = await supabase.functions.invoke('mosque-admin', {
        body: { action: 'delete_announcement', location_id: locationId, data: { id } },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['admin-mosque-events', locationId] });
      qc.invalidateQueries({ queryKey: ['mosque-events', locationId] });
    } catch (e: any) {
      toast.error(e.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-3">
      {!editing && (
        <button
          onClick={() => setEditing({ ...empty })}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> New Announcement / Event
        </button>
      )}

      {editing && (
        <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-3 space-y-2">
          <input
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
            placeholder="Title (e.g. Jummah Bayan by Sheikh…)"
            value={editing.title}
            onChange={e => setEditing({ ...editing, title: e.target.value })}
          />
          <textarea
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
            rows={3}
            placeholder="Details / description"
            value={editing.body}
            onChange={e => setEditing({ ...editing, body: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-gray-600">
              Category
              <select
                className="w-full mt-1 px-2 py-2 rounded-lg border border-gray-200 text-sm"
                value={editing.category}
                onChange={e => setEditing({ ...editing, category: e.target.value })}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-gray-600 flex flex-col justify-end">
              <span>Where (optional)</span>
              <input
                className="mt-1 px-2 py-2 rounded-lg border border-gray-200 text-sm"
                placeholder="Main hall"
                value={editing.location_note}
                onChange={e => setEditing({ ...editing, location_note: e.target.value })}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-gray-600">
              Start
              <input
                type="datetime-local"
                className="w-full mt-1 px-2 py-2 rounded-lg border border-gray-200 text-sm"
                value={editing.event_at}
                onChange={e => setEditing({ ...editing, event_at: e.target.value })}
              />
            </label>
            <label className="text-xs font-semibold text-gray-600">
              End
              <input
                type="datetime-local"
                className="w-full mt-1 px-2 py-2 rounded-lg border border-gray-200 text-sm"
                value={editing.end_at}
                onChange={e => setEditing({ ...editing, end_at: e.target.value })}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-700 py-1">
            <input
              type="checkbox"
              checked={editing.allow_rsvp}
              onChange={e => setEditing({ ...editing, allow_rsvp: e.target.checked })}
            />
            Allow attendees to RSVP (Going / Maybe / Can't)
          </label>
          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-1"
            >
              <Save className="w-3.5 h-3.5" /> {editing.id ? 'Update' : 'Publish'}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {(events ?? []).map((e: any) => (
          <div key={e.id} className="bg-white border border-gray-100 rounded-xl p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <span className="text-[10px] uppercase font-bold text-emerald-600">{e.category}</span>
                  {e.allow_rsvp && <span className="text-[10px] text-blue-600 font-semibold">· RSVP</span>}
                </div>
                <p className="text-sm font-bold text-gray-800 truncate">{e.title}</p>
                {e.event_at && (
                  <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" /> {new Date(e.event_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditing({
                    id: e.id, title: e.title, body: e.body || '', category: e.category || 'announcement',
                    event_at: toInput(e.event_at), end_at: toInput(e.end_at),
                    location_note: e.location_note || '', allow_rsvp: !!e.allow_rsvp,
                  })}
                  className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => sendPush(e)}
                  title="Send push to followers"
                  className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remove(e.id)} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {(!events || events.length === 0) && !editing && (
          <p className="text-center text-xs text-gray-400 py-4">No announcements yet</p>
        )}
      </div>
    </div>
  );
};
