import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, LogIn, LogOut, Save, Edit2, ChevronDown, ChevronUp, Camera, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useLocations } from '@/hooks/useLocations';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TimePicker12h, formatTime12h } from '@/components/TimePicker12h';

/**
 * Returns the last day of a given month name (1-indexed).
 * Uses the current year.
 */
function getMonthEndDay(monthName: string): number {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthIndex = monthNames.indexOf(monthName);
  if (monthIndex === -1) return 31;
  // Day 0 of next month = last day of this month
  return new Date(new Date().getFullYear(), monthIndex + 1, 0).getDate();
}

/**
 * Formats a date range like "24-31" to use dynamic month end, e.g. "24-28" for Feb.
 */
function formatDateRangeDisplay(dateRange: string, monthName: string): string {
  if (!dateRange) return dateRange;
  const parts = dateRange.split('-');
  if (parts.length === 2) {
    const start = parseInt(parts[0]);
    const end = parseInt(parts[1]);
    const monthEnd = getMonthEndDay(monthName);
    // If range end >= 28 (i.e. near month end), cap to actual month end
    if (end >= 28) {
      return `${start}-${monthEnd}`;
    }
  }
  return dateRange;
}

const SUPABASE_URL = "https://lhufqnokmdqkvzcxqwkl.supabase.co";

interface MosqueAdminPanelProps {
  onBack: () => void;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MosqueAdminPanel = ({ onBack }: MosqueAdminPanelProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingPT, setEditingPT] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(monthNames[new Date().getMonth()]);
  const [expandedSection, setExpandedSection] = useState<string | null>('mosque');
  const queryClient = useQueryClient();

  const { data: locations } = useLocations();

  // Restore session
  useEffect(() => {
    const saved = localStorage.getItem('mosqueAdminSession');
    if (saved) {
      try {
        const session = JSON.parse(saved);
        setUsername(session.username);
        setPassword(session.password);
        setLocationId(session.locationId);
        setIsLoggedIn(true);
      } catch { }
    }
  }, []);

  const mosque = useMemo(() => locations?.find(l => l.id === locationId), [locations, locationId]);

  const { data: prayerTimes, refetch: refetchPT } = useQuery({
    queryKey: ['admin-prayer-times', locationId, selectedMonth],
    queryFn: async () => {
    const { data, error } = await supabase
        .from('prayer_times')
        .select('*')
        .eq('location_id', locationId!)
        .eq('month', selectedMonth);
      if (error) throw error;
      // Sort by date range start number
      const sorted = (data || []).sort((a, b) => {
        const aStart = parseInt(a.date_range.match(/^(\d+)/)?.[1] || '999');
        const bStart = parseInt(b.date_range.match(/^(\d+)/)?.[1] || '999');
        return aStart - bStart;
      });
      return sorted;
    },
    enabled: !!locationId && isLoggedIn,
  });

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Login failed');
        return;
      }
      setLocationId(data.location_id);
      setIsLoggedIn(true);
      localStorage.setItem('mosqueAdminSession', JSON.stringify({
        username, password, locationId: data.location_id
      }));
      toast.success('Logged in successfully!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLocationId(null);
    setUsername('');
    setPassword('');
    localStorage.removeItem('mosqueAdminSession');
    toast.success('Logged out');
  };

  const handleUpdateMosque = async (field: string, value: any) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_location',
          username, password, location_id: locationId,
          data: { [field]: value }
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${field} updated!`);
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdatePrayerTime = async (ptId: string, fields: Record<string, any>) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_prayer_times',
          username, password, location_id: locationId,
          data: { id: ptId, ...fields }
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Prayer time updated!');
      // Invalidate ALL prayer-time related queries so changes reflect everywhere
      refetchPT();
      queryClient.invalidateQueries({ queryKey: ['prayer-times'] });
      queryClient.invalidateQueries({ queryKey: ['static-prayer-times'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['mosque-prayer-status'] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 p-4 pb-28">
        <button onClick={onBack} className="p-2 mb-4">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="max-w-sm mx-auto mt-10">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl mx-auto mb-3 flex items-center justify-center">
                <LogIn className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">Mosque Admin Login</h2>
              <p className="text-xs text-gray-500 mt-1">Login to manage your mosque data</p>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-300"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <Button
                onClick={handleLogin}
                disabled={loading || !username || !password}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl py-3 h-auto font-semibold"
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin Panel
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 p-3 pb-28 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-sm font-bold text-gray-800">
          {mosque?.mosque_name || 'Admin Panel'}
        </h2>
        <button onClick={handleLogout} className="p-2 bg-red-50 rounded-lg">
          <LogOut className="w-4 h-4 text-red-600" />
        </button>
      </div>

      {/* Mosque Info Section */}
      <CollapsibleSection
        title="Mosque Info"
        expanded={expandedSection === 'mosque'}
        onToggle={() => setExpandedSection(expandedSection === 'mosque' ? null : 'mosque')}
      >
        {mosque && (
          <div className="space-y-2">
            <EditableField label="Mosque Name" value={mosque.mosque_name} onSave={v => handleUpdateMosque('mosque_name', v)} />
            <EditableField label="District" value={mosque.district} onSave={v => handleUpdateMosque('district', v)} />
            <EditableField label="Capacity" value={mosque.mosque_capacity || ''} onSave={v => handleUpdateMosque('mosque_capacity', v)} />
            <EditableField label="Sahar Food Contact" value={mosque.sahar_food_contact_number || ''} onSave={v => handleUpdateMosque('sahar_food_contact_number', v)} />
            <EditableField label="Sahar Food Time" value={mosque.sahar_food_time || ''} onSave={v => handleUpdateMosque('sahar_food_time', v)} />
            <ToggleField label="Women Prayer Hall" value={!!mosque.women_prayer_hall} onSave={v => handleUpdateMosque('women_prayer_hall', v)} />
            <ToggleField label="Sahar Food" value={!!mosque.sahar_food_availability} onSave={v => handleUpdateMosque('sahar_food_availability', v)} />
            <ToggleField label="Parking" value={!!mosque.parking_available} onSave={v => handleUpdateMosque('parking_available', v)} />
            <ToggleField label="AC" value={!!mosque.ac_available} onSave={v => handleUpdateMosque('ac_available', v)} />
            <ToggleField label="Wheelchair Access" value={!!mosque.wheelchair_accessible} onSave={v => handleUpdateMosque('wheelchair_accessible', v)} />
          </div>
        )}
      </CollapsibleSection>

      {/* Prayer Times Section */}
      <CollapsibleSection
        title="Prayer Times"
        expanded={expandedSection === 'prayer'}
        onToggle={() => setExpandedSection(expandedSection === 'prayer' ? null : 'prayer')}
      >
        <div className="space-y-3">
          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            {monthNames.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {prayerTimes?.map(pt => (
            <div key={pt.id} className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-700">
                  {formatDateRangeDisplay(pt.date_range, selectedMonth)} {selectedMonth}
                </span>
                <button
                  onClick={() => setEditingPT(editingPT === pt.id ? null : pt.id)}
                  className="p-1.5 bg-emerald-50 rounded-lg"
                >
                  <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                </button>
              </div>

              {editingPT === pt.id ? (
                <PrayerTimeEditor
                  prayerTime={pt}
                  onSave={(fields) => {
                    handleUpdatePrayerTime(pt.id, fields);
                    setEditingPT(null);
                  }}
                  onCancel={() => setEditingPT(null)}
                />
              ) : (
                <div className="space-y-1">
                  {/* Compact grid showing Adhan + Iqamah for all 5 prayers */}
                  <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
                    {['Fajr', 'Zuhr', 'Asr', 'Magh', 'Isha'].map(name => (
                      <p key={name} className="text-gray-400 font-medium">{name}</p>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
                    {['fajr_adhan', 'dhuhr_adhan', 'asr_adhan', 'maghrib_adhan', 'isha_adhan'].map(key => (
                      <p key={key} className="text-blue-600 font-medium">
                        {formatTime12h((pt as any)[key])}
                      </p>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
                    {['fajr_iqamah', 'dhuhr_iqamah', 'asr_iqamah', 'maghrib_iqamah', 'isha_iqamah'].map(key => (
                      <p key={key} className="text-emerald-700 font-bold">
                        {formatTime12h((pt as any)[key])}
                      </p>
                    ))}
                  </div>
                  {/* Labels */}
                  <div className="flex justify-center gap-4 mt-1">
                    <span className="text-[9px] text-blue-500">● Adhan</span>
                    <span className="text-[9px] text-emerald-600">● Iqamah</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Photos Section */}
      <CollapsibleSection
        title="Photos"
        expanded={expandedSection === 'photos'}
        onToggle={() => setExpandedSection(expandedSection === 'photos' ? null : 'photos')}
      >
        <PhotoManager locationId={locationId!} username={username} password={password} />
      </CollapsibleSection>
    </div>
  );
};

// Helper components
const CollapsibleSection = ({ title, expanded, onToggle, children }: {
  title: string; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <button onClick={onToggle} className="w-full flex items-center justify-between p-4">
      <span className="text-sm font-bold text-gray-800">{title}</span>
      {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
    </button>
    {expanded && <div className="px-4 pb-4">{children}</div>}
  </div>
);

const EditableField = ({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  if (!editing) {
    return (
      <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
        <div>
          <p className="text-[10px] text-gray-400 uppercase">{label}</p>
          <p className="text-sm text-gray-700">{value || '-'}</p>
        </div>
        <button onClick={() => { setVal(value); setEditing(true); }} className="p-1.5 bg-white rounded-lg border border-gray-200">
          <Edit2 className="w-3 h-3 text-gray-500" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-2.5 bg-emerald-50 rounded-xl space-y-2">
      <p className="text-[10px] text-emerald-600 uppercase font-medium">{label}</p>
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        autoFocus
      />
      <div className="flex gap-2">
        <button onClick={() => { onSave(val); setEditing(false); }} className="flex-1 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold">
          <Save className="w-3 h-3 inline mr-1" />Save
        </button>
        <button onClick={() => setEditing(false)} className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-xs">Cancel</button>
      </div>
    </div>
  );
};

const ToggleField = ({ label, value, onSave }: { label: string; value: boolean; onSave: (v: boolean) => void }) => (
  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
    <span className="text-sm text-gray-700">{label}</span>
    <button
      onClick={() => onSave(!value)}
      className={`w-10 h-6 rounded-full transition-colors ${value ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${value ? 'translate-x-4' : ''}`} />
    </button>
  </div>
);

const PrayerTimeEditor = ({ prayerTime, onSave, onCancel }: {
  prayerTime: any; onSave: (fields: Record<string, any>) => void; onCancel: () => void;
}) => {
  const fields = [
    { key: 'fajr_adhan', label: 'Fajr Azaan' },
    { key: 'fajr_iqamah', label: 'Fajr Iqamah' },
    { key: 'fajr_ramadan_iqamah', label: 'Fajr Ramadan Iqamah', ramadan: true },
    { key: 'dhuhr_adhan', label: 'Zuhr Azaan' },
    { key: 'dhuhr_iqamah', label: 'Zuhr Iqamah' },
    { key: 'asr_adhan', label: 'Asr Azaan' },
    { key: 'asr_iqamah', label: 'Asr Iqamah' },
    { key: 'maghrib_adhan', label: 'Maghrib Azaan' },
    { key: 'maghrib_iqamah', label: 'Maghrib Iqamah' },
    { key: 'maghrib_ramadan_adhan', label: 'Maghrib Ramadan Azaan', ramadan: true },
    { key: 'maghrib_ramadan_iqamah', label: 'Maghrib Ramadan Iqamah', ramadan: true },
    { key: 'isha_adhan', label: 'Isha Azaan' },
    { key: 'isha_iqamah', label: 'Isha Iqamah' },
    { key: 'isha_ramadan_iqamah', label: 'Isha Ramadan Iqamah', ramadan: true },
    { key: 'jummah_adhan', label: 'Jummah Azaan' },
    { key: 'jummah_iqamah', label: 'Jummah Khutbah' },
    { key: 'sahar_end', label: 'Sahar End', ramadan: true },
    { key: 'ifthar_time', label: 'Iftar Time', ramadan: true },
    { key: 'tharaweeh', label: 'Tharaweeh', ramadan: true },
    { key: 'sun_rise', label: 'Sunrise' },
    { key: 'sun_set', label: 'Sunset' },
    { key: 'mid_noon', label: 'Mid Noon' },
    { key: 'ishraq_time', label: 'Ishraq' },
    { key: 'tahajjud_start', label: 'Tahajjud Start' },
    { key: 'tahajjud_end', label: 'Tahajjud End' },
  ];

  // Only show Ramadan fields that have data in the database
  const visibleFields = fields.filter(f => {
    if (!f.ramadan) return true;
    return prayerTime[f.key] !== null && prayerTime[f.key] !== undefined && prayerTime[f.key] !== '';
  });

  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    fields.forEach(f => { v[f.key] = prayerTime[f.key] || ''; });
    return v;
  });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {visibleFields.map(f => (
          <TimePicker12h
            key={f.key}
            label={f.label}
            value={values[f.key]}
            onChange={(v) => setValues(prev => ({ ...prev, [f.key]: v }))}
          />
        ))}
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={() => {
          const changed: Record<string, any> = {};
          Object.entries(values).forEach(([k, v]) => {
            if (v !== (prayerTime[k] || '')) {
              changed[k] = v || null;
            }
          });
          if (Object.keys(changed).length > 0) onSave(changed);
          else onCancel();
        }} className="flex-1 bg-emerald-500 text-white rounded-xl text-xs h-9">
          <Save className="w-3 h-3 mr-1" /> Save Changes
        </Button>
        <Button variant="outline" onClick={onCancel} className="rounded-xl text-xs h-9">Cancel</Button>
      </div>
    </div>
  );
};

const SUPABASE_URL_PHOTOS = "https://lhufqnokmdqkvzcxqwkl.supabase.co";

const PhotoManager = ({ locationId, username, password }: { locationId: string; username: string; password: string }) => {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: photos, refetch } = useQuery({
    queryKey: ['admin-mosque-photos', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mosque_photos')
        .select('*')
        .eq('location_id', locationId)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const compressImage = (file: File, maxSizeKB: number = 100): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          // Scale down
          let { width, height } = img;
          const maxDim = 800;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);

          // Compress iteratively
          let quality = 0.7;
          const tryCompress = () => {
            canvas.toBlob((blob) => {
              if (!blob) return reject(new Error('Compression failed'));
              if (blob.size <= maxSizeKB * 1024 || quality <= 0.1) {
                resolve(blob);
              } else {
                quality -= 0.1;
                tryCompress();
              }
            }, 'image/jpeg', quality);
          };
          tryCompress();
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentCount = photos?.length || 0;
    if (currentCount + files.length > 6) {
      toast.error(`Maximum 6 photos. You can add ${6 - currentCount} more.`);
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append('action', 'upload');
        formData.append('username', username);
        formData.append('password', password);
        formData.append('location_id', locationId);
        formData.append('photo', compressed, 'photo.jpg');

        const res = await fetch(`${SUPABASE_URL_PHOTOS}/functions/v1/mosque-photos`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }
      toast.success('Photos uploaded!');
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      const formData = new FormData();
      formData.append('action', 'delete');
      formData.append('username', username);
      formData.append('password', password);
      formData.append('location_id', locationId);
      formData.append('photo_id', photoId);

      const res = await fetch(`${SUPABASE_URL_PHOTOS}/functions/v1/mosque-photos`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Photo deleted');
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{photos?.length || 0}/6 photos</p>
        <label className={`flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
          <Upload className="w-3 h-3" />
          {uploading ? 'Uploading...' : 'Add Photo'}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading || (photos?.length || 0) >= 6}
            className="hidden"
          />
        </label>
      </div>

      {photos && photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo: any) => (
            <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200">
              <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => handleDelete(photo.id)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-400">Images auto-compressed to ~100KB each</p>
    </div>
  );
};
