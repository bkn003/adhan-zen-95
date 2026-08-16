import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, LogIn, LogOut, Save, Edit2, ChevronDown, ChevronUp, Camera, Trash2, Upload, Clock, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useLocations } from '@/hooks/useLocations';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TimePicker12h, formatTime12h } from '@/components/TimePicker12h';
import { clearCacheForLocation, clearAllPrayerCache } from '@/utils/prayerCache';
import { useCustomFilters, useLocationFilters, useSetLocationFilters } from '@/hooks/useCustomFilters';
import { useSignedPhotoUrls, invalidateSignedPhotoUrl } from '@/utils/signedPhotoUrls';
import { EventsAdmin } from '@/components/admin/EventsAdmin';
import { DonationAdmin } from '@/components/admin/DonationAdmin';
import { ReviewsAdmin } from '@/components/admin/ReviewsAdmin';
import { AuditTrail } from '@/components/admin/AuditTrail';
import { AttendanceAdmin } from '@/components/admin/AttendanceAdmin';

import { AdminAuthCard } from '@/components/admin/AdminAuthCard';
import { authHeaders, fetchAdminScope, adminSignOut } from '@/utils/adminApi';


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
  const [adminEmail, setAdminEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingPT, setEditingPT] = useState<string | null>(null);
  const [addingNewPT, setAddingNewPT] = useState(false);
  const [newDateRange, setNewDateRange] = useState('1-5');
  const [selectedMonth, setSelectedMonth] = useState(monthNames[new Date().getMonth()]);
  const [expandedSection, setExpandedSection] = useState<string | null>('mosque');
  const queryClient = useQueryClient();

  const { data: locations } = useLocations({ includePaused: true });

  /** Reads the signed-in account's admin scope from the server. */
  const loadScope = React.useCallback(async () => {
    const scope = await fetchAdminScope();
    if (scope && (scope.location_id || scope.is_super_admin)) {
      setAdminEmail(scope.email);
      setLocationId(scope.location_id);
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
      setLocationId(null);
    }
    return scope;
  }, []);

  // Restore an existing Supabase session
  useEffect(() => {
    loadScope().finally(() => setCheckingSession(false));
  }, [loadScope]);

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

  const handleSignedIn = async () => {
    const scope = await loadScope();
    if (!scope) {
      toast.error('Could not verify this account');
      return;
    }
    if (!scope.location_id && !scope.is_super_admin) {
      toast.error('This account is not linked to any mosque yet');
      await adminSignOut();
      return;
    }
    toast.success('Signed in');
  };

  const handleLogout = async () => {
    await adminSignOut();
    setIsLoggedIn(false);
    setLocationId(null);
    setAdminEmail('');
    toast.success('Signed out');
  };

  const handleUpdateMosque = async (field: string, value: any) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          action: 'update_location',
          location_id: locationId,
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

  const clearPrayerCaches = () => {
    if (locationId) {
      clearCacheForLocation(locationId);
    }
    clearAllPrayerCache();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('pt:')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Error clearing static prayer cache:', e);
    }
    refetchPT();
    queryClient.invalidateQueries({ queryKey: ['prayer-times'], refetchType: 'all' });
    queryClient.invalidateQueries({ queryKey: ['static-prayer-times'], refetchType: 'all' });
    queryClient.invalidateQueries({ queryKey: ['locations'], refetchType: 'all' });
    queryClient.invalidateQueries({ queryKey: ['mosque-prayer-status'], refetchType: 'all' });
  };

  const handleUpdatePrayerTime = async (ptId: string, fields: Record<string, any>) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          action: 'update_prayer_times',
          location_id: locationId,
          data: { id: ptId, ...fields }
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Prayer time updated!');
      clearPrayerCaches();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddPrayerTime = async (fields: Record<string, any>) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          action: 'update_prayer_times',
          location_id: locationId,
          data: { month: selectedMonth, date_range: newDateRange, ...fields }
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Prayer times added for ${newDateRange} ${selectedMonth}!`);
      setAddingNewPT(false);
      setNewDateRange('1-5');
      clearPrayerCaches();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    );
  }

  // Login Screen — real Supabase authentication
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 p-4 pb-28">
        <button onClick={onBack} className="p-2 mb-4">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <AdminAuthCard
          title="Mosque Admin Login"
          subtitle="Sign in with the account issued for your mosque"
          variant="light"
          onSignedIn={handleSignedIn}
        />
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

      {/* Amenities & Filters Section */}
      <CollapsibleSection
        title="Amenities & Filters"
        expanded={expandedSection === 'filters'}
        onToggle={() => setExpandedSection(expandedSection === 'filters' ? null : 'filters')}
      >
        <AmenitiesFiltersSection locationId={locationId} />
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

          {/* Add New Date Range Button */}
          <button
            onClick={() => setAddingNewPT(!addingNewPT)}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-98"
          >
            <Clock className="w-4 h-4" />
            {addingNewPT ? 'Cancel Adding' : '+ Add New Date Range'}
          </button>

          {/* Add New Prayer Time Form */}
          {addingNewPT && (
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-emerald-700">Date Range:</label>
                <select
                  value={newDateRange}
                  onChange={e => setNewDateRange(e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-emerald-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="1-5">1-5</option>
                  <option value="6-11">6-11</option>
                  <option value="12-17">12-17</option>
                  <option value="18-23">18-23</option>
                  <option value={`24-${getMonthEndDay(selectedMonth)}`}>24-{getMonthEndDay(selectedMonth)}</option>
                </select>
              </div>
              <p className="text-xs text-emerald-600">
                Adding prayer times for <strong>{newDateRange} {selectedMonth}</strong>
              </p>
              <PrayerTimeEditor
                prayerTime={{}}
                onSave={(fields) => handleAddPrayerTime(fields)}
                onCancel={() => setAddingNewPT(false)}
              />
            </div>
          )}

          {(!prayerTimes || prayerTimes.length === 0) && !addingNewPT && (
            <div className="text-center py-6 text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No prayer times for {selectedMonth}</p>
              <p className="text-xs mt-1">Tap "+ Add New Date Range" to add prayer times</p>
            </div>
          )}

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
                <div className="space-y-2">
                  {/* Prayer cards - grouped by prayer name */}
                  {[
                    { name: 'Fajr', icon: '🌅', adhan: 'fajr_adhan', iqamah: 'fajr_iqamah', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                    { name: 'Zuhr', icon: '☀️', adhan: 'dhuhr_adhan', iqamah: 'dhuhr_iqamah', bg: 'bg-amber-50', border: 'border-amber-100' },
                    { name: 'Asr', icon: '🌤️', adhan: 'asr_adhan', iqamah: 'asr_iqamah', bg: 'bg-orange-50', border: 'border-orange-100' },
                    { name: 'Maghrib', icon: '🌇', adhan: 'maghrib_adhan', iqamah: 'maghrib_iqamah', bg: 'bg-rose-50', border: 'border-rose-100' },
                    { name: 'Isha', icon: '🌙', adhan: 'isha_adhan', iqamah: 'isha_iqamah', bg: 'bg-purple-50', border: 'border-purple-100' },
                  ].map(prayer => (
                    <div key={prayer.name} className={`flex items-center justify-between ${prayer.bg} ${prayer.border} border rounded-lg px-3 py-2`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{prayer.icon}</span>
                        <span className="text-xs font-bold text-gray-700 w-16">{prayer.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-[9px] text-blue-400 font-medium">Adhan</p>
                          <p className="text-xs font-bold text-blue-600">{formatTime12h((pt as any)[prayer.adhan])}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] text-emerald-400 font-medium">Iqamah</p>
                          <p className="text-xs font-bold text-emerald-600">{formatTime12h((pt as any)[prayer.iqamah])}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Jummah row */}
                  {(pt as any).jummah_adhan && (
                    <div className="flex items-center justify-between bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🕌</span>
                        <span className="text-xs font-bold text-gray-700 w-16">Jummah</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-[9px] text-blue-400 font-medium">Adhan</p>
                          <p className="text-xs font-bold text-blue-600">{formatTime12h((pt as any).jummah_adhan)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] text-emerald-400 font-medium">Khutbah</p>
                          <p className="text-xs font-bold text-emerald-600">{formatTime12h((pt as any).jummah_iqamah)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Sun times row */}
                  {((pt as any).sun_rise || (pt as any).sun_set) && (
                    <div className="flex items-center justify-between bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🌞</span>
                        <span className="text-[10px] font-medium text-gray-500">Sun</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px]">
                        {(pt as any).sun_rise && <span className="text-orange-600">↑ {formatTime12h((pt as any).sun_rise)}</span>}
                        {(pt as any).mid_noon && <span className="text-yellow-600">◆ {formatTime12h((pt as any).mid_noon)}</span>}
                        {(pt as any).sun_set && <span className="text-red-600">↓ {formatTime12h((pt as any).sun_set)}</span>}
                      </div>
                    </div>
                  )}
                  {/* Ramadan special times */}
                  {((pt as any).sahar_end || (pt as any).ifthar_time || (pt as any).tharaweeh || (pt as any).fajr_ramadan_iqamah || (pt as any).isha_ramadan_iqamah) && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm">🌙</span>
                        <span className="text-[10px] font-bold text-purple-700">Ramadan</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        {(pt as any).sahar_end && (
                          <div className="text-center">
                            <p className="text-purple-400 font-medium">Sahar End</p>
                            <p className="font-bold text-purple-700">{formatTime12h((pt as any).sahar_end)}</p>
                          </div>
                        )}
                        {(pt as any).ifthar_time && (
                          <div className="text-center">
                            <p className="text-purple-400 font-medium">Iftar</p>
                            <p className="font-bold text-purple-700">{formatTime12h((pt as any).ifthar_time)}</p>
                          </div>
                        )}
                        {(pt as any).tharaweeh && (
                          <div className="text-center">
                            <p className="text-purple-400 font-medium">Tharaweeh</p>
                            <p className="font-bold text-purple-700">{formatTime12h((pt as any).tharaweeh)}</p>
                          </div>
                        )}
                        {(pt as any).fajr_ramadan_iqamah && (
                          <div className="text-center">
                            <p className="text-purple-400 font-medium">Fajr R.Iqamah</p>
                            <p className="font-bold text-purple-700">{formatTime12h((pt as any).fajr_ramadan_iqamah)}</p>
                          </div>
                        )}
                        {(pt as any).maghrib_ramadan_adhan && (
                          <div className="text-center">
                            <p className="text-purple-400 font-medium">Magh R.Adhan</p>
                            <p className="font-bold text-purple-700">{formatTime12h((pt as any).maghrib_ramadan_adhan)}</p>
                          </div>
                        )}
                        {(pt as any).maghrib_ramadan_iqamah && (
                          <div className="text-center">
                            <p className="text-purple-400 font-medium">Magh R.Iqamah</p>
                            <p className="font-bold text-purple-700">{formatTime12h((pt as any).maghrib_ramadan_iqamah)}</p>
                          </div>
                        )}
                        {(pt as any).isha_ramadan_iqamah && (
                          <div className="text-center">
                            <p className="text-purple-400 font-medium">Isha R.Iqamah</p>
                            <p className="font-bold text-purple-700">{formatTime12h((pt as any).isha_ramadan_iqamah)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
        <PhotoManager locationId={locationId!} />
      </CollapsibleSection>

      {/* Events & Announcements */}
      <CollapsibleSection
        title="Events & Announcements"
        expanded={expandedSection === 'events'}
        onToggle={() => setExpandedSection(expandedSection === 'events' ? null : 'events')}
      >
        <EventsAdmin locationId={locationId!} />
      </CollapsibleSection>

      {/* Reviews moderation */}
      <CollapsibleSection
        title="Reviews & Moderation"
        expanded={expandedSection === 'reviews'}
        onToggle={() => setExpandedSection(expandedSection === 'reviews' ? null : 'reviews')}
      >
        <ReviewsAdmin locationId={locationId!} />
      </CollapsibleSection>

      {/* Donations */}
      <CollapsibleSection
        title="Donations (UPI / Bank)"
        expanded={expandedSection === 'donations'}
        onToggle={() => setExpandedSection(expandedSection === 'donations' ? null : 'donations')}
      >
        <DonationAdmin locationId={locationId!} location={mosque} />
      </CollapsibleSection>

      {/* Jamaat attendance roster */}
      <CollapsibleSection
        title="Jamaat Attendance (who attended)"
        expanded={expandedSection === 'attendance'}
        onToggle={() => setExpandedSection(expandedSection === 'attendance' ? null : 'attendance')}
      >
        <AttendanceAdmin locationId={locationId!} />
      </CollapsibleSection>

      {/* Timing edit history / audit trail */}
      <CollapsibleSection
        title="Edit History & Rollback"
        expanded={expandedSection === 'audit'}
        onToggle={() => setExpandedSection(expandedSection === 'audit' ? null : 'audit')}
      >
        <AuditTrail locationId={locationId!} canRollback />
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
  const prayerGroups = [
    {
      title: '🌅 Fajr', fields: [
        { key: 'fajr_adhan', label: 'Adhan' },
        { key: 'fajr_iqamah', label: 'Iqamah' },
      ]
    },
    {
      title: '☀️ Zuhr', fields: [
        { key: 'dhuhr_adhan', label: 'Adhan' },
        { key: 'dhuhr_iqamah', label: 'Iqamah' },
      ]
    },
    {
      title: '🌤️ Asr', fields: [
        { key: 'asr_adhan', label: 'Adhan' },
        { key: 'asr_iqamah', label: 'Iqamah' },
      ]
    },
    {
      title: '🌇 Maghrib', fields: [
        { key: 'maghrib_adhan', label: 'Adhan' },
        { key: 'maghrib_iqamah', label: 'Iqamah' },
      ]
    },
    {
      title: '🌙 Isha', fields: [
        { key: 'isha_adhan', label: 'Adhan' },
        { key: 'isha_iqamah', label: 'Iqamah' },
      ]
    },
    {
      title: '🕌 Jummah', fields: [
        { key: 'jummah_adhan', label: 'Adhan' },
        { key: 'jummah_iqamah', label: 'Khutbah' },
      ]
    },
    {
      title: '🌙 Ramadan Special', fields: [
        { key: 'fajr_ramadan_iqamah', label: 'Fajr Ramadan Iqamah' },
        { key: 'maghrib_ramadan_adhan', label: 'Maghrib Ramadan Adhan' },
        { key: 'maghrib_ramadan_iqamah', label: 'Maghrib Ramadan Iqamah' },
        { key: 'isha_ramadan_iqamah', label: 'Isha Ramadan Iqamah' },
        { key: 'sahar_end', label: 'Sahar End' },
        { key: 'ifthar_time', label: 'Iftar Time' },
        { key: 'tharaweeh', label: 'Tharaweeh' },
      ]
    },
    {
      title: '🌞 Sun Times', fields: [
        { key: 'sun_rise', label: 'Sunrise' },
        { key: 'mid_noon', label: 'Mid Noon' },
        { key: 'sun_set', label: 'Sunset' },
      ]
    },
    {
      title: '🕐 Other', fields: [
        { key: 'ishraq_time', label: 'Ishraq' },
        { key: 'tahajjud_start', label: 'Tahajjud Start' },
        { key: 'tahajjud_end', label: 'Tahajjud End' },
      ]
    },
  ];

  const allFields = prayerGroups.flatMap(g => g.fields);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    allFields.forEach(f => { v[f.key] = prayerTime[f.key] || ''; });
    return v;
  });

  return (
    <div className="space-y-3">
      {prayerGroups.map(group => (
        <div key={group.title} className={`rounded-xl p-2.5 border ${group.title.includes('Ramadan') ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-100'}`}>
          <p className={`text-xs font-bold mb-2 ${group.title.includes('Ramadan') ? 'text-purple-700' : 'text-gray-600'}`}>{group.title}</p>
          <div className="grid grid-cols-2 gap-2">
            {group.fields.map(f => (
              <TimePicker12h
                key={f.key}
                label={f.label}
                value={values[f.key]}
                onChange={(v) => setValues(prev => ({ ...prev, [f.key]: v }))}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <Button onClick={() => {
          const changed: Record<string, any> = {};

          if (!prayerTime.id) {
            // NEW RECORD: Send all fields (edge function will sanitize "" to null)
            Object.entries(values).forEach(([k, v]) => {
              changed[k] = v;
            });
          } else {
            // EXISTING RECORD: Only send what changed
            Object.entries(values).forEach(([k, v]) => {
              if (v !== (prayerTime[k] || '')) {
                changed[k] = v;
              }
            });
          }

          if (Object.keys(changed).length > 0) onSave(changed);
          else onCancel();
        }} className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-xs h-10 font-semibold">
          <Save className="w-3.5 h-3.5 mr-1.5" /> Save Changes
        </Button>
        <Button variant="outline" onClick={onCancel} className="rounded-xl text-xs h-10 px-4">Cancel</Button>
      </div>
    </div>
  );
};

// Amenities & Filters Section - dynamic filter toggles from custom_filters table
const AmenitiesFiltersSection = ({ locationId }: { locationId: string }) => {
  const { data: filters, isLoading: filtersLoading } = useCustomFilters();
  const { data: activeFilterIds, isLoading: locationFiltersLoading } = useLocationFilters(locationId);
  const setLocationFilters = useSetLocationFilters();

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    teal: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  const toggleFilter = async (filterId: string) => {
    if (!activeFilterIds) return;
    const isActive = activeFilterIds.includes(filterId);
    const newIds = isActive
      ? activeFilterIds.filter(id => id !== filterId)
      : [...activeFilterIds, filterId];

    try {
      await setLocationFilters.mutateAsync({
        locationId,
        filterIds: newIds,
      });
      toast.success(isActive ? 'Filter removed' : 'Filter added');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update filters');
    }
  };

  if (filtersLoading || locationFiltersLoading) {
    return <div className="text-center py-4 text-gray-500 text-xs">Loading filters...</div>;
  }

  if (!filters || filters.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">No custom filters available</p>
        <p className="text-xs text-gray-600 mt-1">Ask super admin to add filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 mb-2">Tap to toggle amenities your mosque offers:</p>
      <div className="flex flex-wrap gap-2">
        {filters.map(filter => {
          const isActive = activeFilterIds?.includes(filter.id) || false;
          const colors = colorMap[filter.color] || colorMap.gray;
          return (
            <button
              key={filter.id}
              onClick={() => toggleFilter(filter.id)}
              disabled={setLocationFilters.isPending}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${isActive
                ? colors
                : 'bg-gray-800/50 text-gray-500 border-gray-700/30 opacity-50'
                }`}
            >
              <span>{filter.icon}</span>
              {filter.name}
              {isActive && <span className="ml-1">✓</span>}
            </button>
          );
        })}
      </div>
      {setLocationFilters.isPending && (
        <p className="text-xs text-amber-400 mt-1">Saving...</p>
      )}
    </div>
  );
};

const SUPABASE_URL_PHOTOS = "https://lhufqnokmdqkvzcxqwkl.supabase.co";

const PhotoManager = ({ locationId }: { locationId: string }) => {
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
        formData.append('location_id', locationId);
        formData.append('photo', compressed, 'photo.jpg');

        const res = await fetch(`${SUPABASE_URL_PHOTOS}/functions/v1/mosque-photos`, {
          method: 'POST',
          headers: await authHeaders(false),
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
      formData.append('location_id', locationId);
      formData.append('photo_id', photoId);

      const res = await fetch(`${SUPABASE_URL_PHOTOS}/functions/v1/mosque-photos`, {
        method: 'POST',
        headers: await authHeaders(false),
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

      {photos && photos.length > 0 && <PhotoGrid photos={photos} onDelete={handleDelete} />}

      <p className="text-[10px] text-gray-400">Images auto-compressed to ~100KB each</p>
    </div>
  );
};

const PhotoGrid = ({ photos, onDelete }: { photos: any[]; onDelete: (id: string) => void }) => {
  const signed = useSignedPhotoUrls(photos.map((p) => p.id));
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo) => {
        const src = signed[photo.id] || photo.photo_url || '';
        return (
          <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
            {src && <img src={src} alt="" className="w-full h-full object-cover" />}
            <button
              onClick={() => { invalidateSignedPhotoUrl(photo.id); onDelete(photo.id); }}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
