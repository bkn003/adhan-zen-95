import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Eye, EyeOff, Save, Trash2, Plus, Search, Pause, Play, Settings, LayoutGrid, Tag, BarChart3, X, Check, ToggleLeft, ToggleRight, Moon, Calendar, Clock, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocations } from '@/hooks/useLocations';
import { useAllCustomFilters, useManageFilter, type CustomFilter } from '@/hooks/useCustomFilters';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';
import { TimePicker12h, formatTime12h } from '@/components/TimePicker12h';
import { HijriAdjustment } from '@/components/HijriAdjustment';
import { useRamadanContext } from '@/contexts/RamadanContext';

import { getSuperToken, setSuperToken } from '@/utils/superSession';

const SUPABASE_URL = "https://lhufqnokmdqkvzcxqwkl.supabase.co";

interface SuperAdminPanelProps {
  onBack: () => void;
}

const EMOJI_OPTIONS = ['🏷️', '🍽️', '👩', '🅿️', '❄️', '♿', '🕌', '📖', '🎓', '🏥', '🚿', '🛏️', '📡', '🔊', '💡', '🏗️', '🌳', '🚰', '🧹', '🛡️'];
const COLOR_OPTIONS = [
  { name: 'emerald', bg: 'bg-emerald-500' },
  { name: 'purple', bg: 'bg-purple-500' },
  { name: 'amber', bg: 'bg-amber-500' },
  { name: 'cyan', bg: 'bg-cyan-500' },
  { name: 'blue', bg: 'bg-blue-500' },
  { name: 'rose', bg: 'bg-rose-500' },
  { name: 'orange', bg: 'bg-orange-500' },
  { name: 'teal', bg: 'bg-teal-500' },
  { name: 'indigo', bg: 'bg-indigo-500' },
  { name: 'pink', bg: 'bg-pink-500' },
];

const DATE_RANGES = ['1-5', '6-11', '12-17', '18-23'];
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getMonthEndDay(monthName: string): number {
  const idx = monthNames.indexOf(monthName);
  if (idx === -1) return 31;
  return new Date(new Date().getFullYear(), idx + 1, 0).getDate();
}

export const SuperAdminPanel = ({ onBack }: SuperAdminPanelProps) => {
  const [superPassword, setSuperPassword] = useState('');
  const [showSuperPass, setShowSuperPass] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'mosques' | 'filters' | 'dashboard' | 'settings'>('dashboard');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [adminMap, setAdminMap] = useState<Record<string, string>>({});
  const { t } = useLanguage();
  const { isRamadan, setIsRamadan } = useRamadanContext();

  const { data: rawLocations, refetch: refetchLocations } = useLocations({ includePaused: true });
  const locations = React.useMemo(
    () => rawLocations?.map(l => ({ ...l, admin_username: adminMap[l.id] })),
    [rawLocations, adminMap]
  );
  const { data: allFilters, refetch: refetchFilters } = useAllCustomFilters();
  const manageFilter = useManageFilter();

  const fetchAdmins = React.useCallback(async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ super_token: getSuperToken(), action: 'super_list_admins' }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.admins)) {
        const map: Record<string, string> = {};
        for (const a of data.admins) map[a.location_id] = a.username;
        setAdminMap(map);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchAdmins();
  }, [isAuthenticated, fetchAdmins]);

  const [showAddFilter, setShowAddFilter] = useState(false);
  const [newFilter, setNewFilter] = useState({ name: '', icon: '🏷️', color: 'gray' });

  // New mosque with prayer times wizard
  const [showAddMosque, setShowAddMosque] = useState(false);
  const [addMosqueStep, setAddMosqueStep] = useState<'info' | 'prayer-times'>('info');
  const [newMosque, setNewMosque] = useState({ mosque_name: '', district: '', latitude: '', longitude: '' });
  const [newMosqueId, setNewMosqueId] = useState<string | null>(null);
  const [addingMosque, setAddingMosque] = useState(false);
  const [wizardMonth, setWizardMonth] = useState(monthNames[new Date().getMonth()]);
  const [wizardRangeIndex, setWizardRangeIndex] = useState(0);
  const [wizardPrayerTimes, setWizardPrayerTimes] = useState<Record<string, Record<string, string>>>({});
  const [savingPrayerTimes, setSavingPrayerTimes] = useState(false);

  // App-support (developer donation) configuration + weekly change watcher
  const [appDonation, setAppDonation] = useState({ enabled: false, upi: '', payee: 'Adhan Zen', note: '' });
  const [savingAppDonation, setSavingAppDonation] = useState(false);
  const [runningWatch, setRunningWatch] = useState(false);

  const callSuper = React.useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ super_token: getSuperToken(), action, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Request failed');
    return data;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    callSuper('super_get_app_settings')
      .then((d) => {
        const map = Object.fromEntries(((d.settings || []) as { key: string; value: string }[]).map((r) => [r.key, r.value]));
        setAppDonation({
          enabled: map['app_donation_enabled'] === 'true',
          upi: map['app_donation_upi_id'] || '',
          payee: map['app_donation_payee'] || 'Adhan Zen',
          note: map['app_donation_note'] || '',
        });
      })
      .catch(() => { /* first run has no settings yet */ });
  }, [isAuthenticated, callSuper]);

  const saveAppDonation = async () => {
    if (appDonation.enabled && !appDonation.upi.trim()) {
      toast.error('Add a UPI ID before enabling app support');
      return;
    }
    setSavingAppDonation(true);
    try {
      await callSuper('super_set_app_settings', {
        data: {
          app_donation_enabled: String(appDonation.enabled),
          app_donation_upi_id: appDonation.upi.trim(),
          app_donation_payee: appDonation.payee.trim() || 'Adhan Zen',
          app_donation_note: appDonation.note.trim(),
        },
      });
      toast.success('App support settings saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingAppDonation(false);
    }
  };

  const runChangeWatch = async () => {
    setRunningWatch(true);
    try {
      const d = await callSuper('super_run_change_watch');
      const r = d?.result || {};
      toast.success(`Checked ${r.rows ?? 0} schedules · ${r.changes ?? 0} change(s) · ${r.pushed ?? 0} alert(s) sent`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Watcher failed');
    } finally {
      setRunningWatch(false);
    }
  };



  // Server-side super admin auth
  const handleSuperLogin = async () => {
    setAuthLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ super_token: getSuperToken(), action: 'super_admin_login', password: superPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      setSuperToken(data.super_token || null);
      setIsAuthenticated(true);
      toast.success('Super Admin authenticated');
    } catch (err: any) {
      toast.error(err.message || 'Invalid super admin password');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSetCredentials = async (locationId: string) => {
    if (!newUsername || !newPassword) {
      toast.error('Username and password are required');
      return;
    }
    setLoading(true);
    try {
      const loc = locations?.find(l => l.id === locationId);
      const body: any = {
        super_token: getSuperToken(),
        action: loc?.admin_username ? 'super_set_credentials' : 'set_credentials',
        location_id: locationId,
        username: newUsername,
        password: newPassword,
      };

      const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Credentials updated!');
      setEditingId(null);
      setNewUsername('');
      setNewPassword('');
      refetchLocations(); fetchAdmins();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCredentials = async (locationId: string) => {
    if (!confirm('Remove admin credentials for this mosque?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ super_token: getSuperToken(), action: 'super_delete_credentials', location_id: locationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Credentials removed!');
      refetchLocations(); fetchAdmins();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminPause = async (location: any) => {
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ super_token: getSuperToken(), action: 'super_pause_mosque', location_id: location.id, data: { is_paused: !location.is_paused } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(location.is_paused ? 'Mosque resumed' : 'Mosque paused');
      refetchLocations(); fetchAdmins();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMosque = async (location: any) => {
    const userInput = prompt(`Type "${location.mosque_name}" to permanently delete:`);
    if (userInput !== location.mosque_name) {
      if (userInput !== null) toast.error('Name did not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ super_token: getSuperToken(), action: 'super_delete_mosque', location_id: location.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Mosque deleted!');
      refetchLocations(); fetchAdmins();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Add mosque info
  const handleAddMosqueInfo = async () => {
    if (!newMosque.mosque_name || !newMosque.district || !newMosque.latitude || !newMosque.longitude) {
      toast.error('All fields are required');
      return;
    }
    setAddingMosque(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          super_token: getSuperToken(),
          action: 'super_add_mosque',
          data: {
            mosque_name: newMosque.mosque_name,
            district: newMosque.district,
            latitude: parseFloat(newMosque.latitude),
            longitude: parseFloat(newMosque.longitude),
          }
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Get the newly created mosque ID
      await refetchLocations(); await fetchAdmins(); fetchAdmins();
      // We need to find it by name since the API doesn't return the ID
      toast.success('Mosque added! Now add prayer times.');
      setAddMosqueStep('prayer-times');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAddingMosque(false);
    }
  };

  // Find the newly added mosque
  useEffect(() => {
    if (addMosqueStep === 'prayer-times' && !newMosqueId && locations) {
      const found = locations.find(l => l.mosque_name === newMosque.mosque_name && l.district === newMosque.district);
      if (found) setNewMosqueId(found.id);
    }
  }, [addMosqueStep, locations, newMosque, newMosqueId]);

  const allDateRanges = [...DATE_RANGES, `24-${getMonthEndDay(wizardMonth)}`];
  const currentWizardRange = allDateRanges[wizardRangeIndex];

  const handleSaveWizardRange = async () => {
    if (!newMosqueId) {
      toast.error('Mosque not found. Please try again.');
      return;
    }
    setSavingPrayerTimes(true);
    try {
      const fields = wizardPrayerTimes[currentWizardRange] || {};
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mosque-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          super_token: getSuperToken(),
          action: 'super_add_prayer_times',
          location_id: newMosqueId,
          data: { month: wizardMonth, date_range: currentWizardRange, ...fields }
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Saved ${currentWizardRange} ${wizardMonth}`);

      if (wizardRangeIndex < allDateRanges.length - 1) {
        setWizardRangeIndex(prev => prev + 1);
      } else {
        toast.success('All prayer times saved!');
        setShowAddMosque(false);
        setAddMosqueStep('info');
        setNewMosque({ mosque_name: '', district: '', latitude: '', longitude: '' });
        setNewMosqueId(null);
        setWizardRangeIndex(0);
        setWizardPrayerTimes({});
        refetchLocations(); fetchAdmins();
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPrayerTimes(false);
    }
  };

  const updateWizardField = (field: string, value: string) => {
    setWizardPrayerTimes(prev => ({
      ...prev,
      [currentWizardRange]: { ...(prev[currentWizardRange] || {}), [field]: value }
    }));
  };

  // Ramadan toggle handler
  const handleRamadanToggle = (enabled: boolean) => {
    setIsRamadan(enabled);
    localStorage.setItem('isRamadan', enabled.toString());
    localStorage.setItem('autoRamadanOverride', 'true');
  };

  // Filter CRUD
  const handleAddFilter = async () => {
    if (!newFilter.name.trim()) { toast.error('Filter name is required'); return; }
    try {
      await manageFilter.mutateAsync({ subAction: 'create', filterData: newFilter });
      toast.success(`Filter "${newFilter.name}" created!`);
      setNewFilter({ name: '', icon: '🏷️', color: 'gray' });
      setShowAddFilter(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleToggleFilter = async (filter: CustomFilter) => {
    try {
      await manageFilter.mutateAsync({ subAction: 'update', filterId: filter.id, filterData: { is_active: !filter.is_active } });
      toast.success(filter.is_active ? `"${filter.name}" disabled` : `"${filter.name}" enabled`);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteFilter = async (filter: CustomFilter) => {
    if (!confirm(`Delete filter "${filter.name}"?`)) return;
    try {
      await manageFilter.mutateAsync({ subAction: 'delete', filterId: filter.id });
      toast.success(`Filter "${filter.name}" deleted`);
    } catch (err: any) { toast.error(err.message); }
  };

  const filtered = locations?.filter(l =>
    l.mosque_name.toLowerCase().includes(search.toLowerCase()) ||
    l.district.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const totalMosques = locations?.length || 0;
  const withAdmin = locations?.filter(l => l.admin_username).length || 0;
  const pausedCount = locations?.filter(l => l.is_paused).length || 0;
  const activeFilters = allFilters?.filter(f => f.is_active).length || 0;
  const totalFilters = allFilters?.length || 0;

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-red-950 p-4 pb-28">
        <button onClick={onBack} className="p-2 mb-4">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="max-w-sm mx-auto mt-10">
          <div className="bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-700/50 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-lg shadow-red-500/30">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Super Admin</h2>
              <p className="text-xs text-gray-400 mt-1">Manage mosque admin credentials & controls</p>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showSuperPass ? 'text' : 'password'}
                  placeholder="Super Admin Password"
                  value={superPassword}
                  onChange={e => setSuperPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSuperLogin()}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 pr-10"
                />
                <button type="button" onClick={() => setShowSuperPass(!showSuperPass)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showSuperPass ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
              <Button
                onClick={handleSuperLogin}
                disabled={!superPassword || authLoading}
                className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl py-3 h-auto font-semibold shadow-lg shadow-red-500/25"
              >
                {authLoading ? 'Authenticating...' : 'Authenticate'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const wizardFields = [
    { title: '🌅 Fajr', fields: [{ key: 'fajr_adhan', label: 'Adhan' }, { key: 'fajr_iqamah', label: 'Iqamah' }] },
    { title: '☀️ Zuhr', fields: [{ key: 'dhuhr_adhan', label: 'Adhan' }, { key: 'dhuhr_iqamah', label: 'Iqamah' }] },
    { title: '🌤️ Asr', fields: [{ key: 'asr_adhan', label: 'Adhan' }, { key: 'asr_iqamah', label: 'Iqamah' }] },
    { title: '🌇 Maghrib', fields: [{ key: 'maghrib_adhan', label: 'Adhan' }, { key: 'maghrib_iqamah', label: 'Iqamah' }] },
    { title: '🌙 Isha', fields: [{ key: 'isha_adhan', label: 'Adhan' }, { key: 'isha_iqamah', label: 'Iqamah' }] },
    { title: '🕌 Jummah', fields: [{ key: 'jummah_adhan', label: 'Adhan' }, { key: 'jummah_iqamah', label: 'Khutbah' }] },
    { title: '🌞 Sun', fields: [{ key: 'sun_rise', label: 'Sunrise' }, { key: 'mid_noon', label: 'Mid Noon' }, { key: 'sun_set', label: 'Sunset' }] },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-red-950 p-3 pb-28 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2"><ArrowLeft className="w-5 h-5 text-gray-400" /></button>
        <h2 className="text-sm font-bold text-white flex items-center gap-2"><Shield className="w-4 h-4 text-red-400" />Super Admin</h2>
        <div className="w-9" />
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-gray-800/60 backdrop-blur-sm rounded-2xl p-1 border border-gray-700/40 overflow-x-auto">
        {([
          { key: 'dashboard', icon: BarChart3, label: 'Stats' },
          { key: 'mosques', icon: LayoutGrid, label: 'Mosques' },
          { key: 'filters', icon: Tag, label: 'Filters' },
          { key: 'settings', icon: Settings, label: 'Settings' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-[10px] font-semibold transition-all whitespace-nowrap ${activeTab === tab.key
              ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25'
              : 'text-gray-400 hover:text-gray-300'
              }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== DASHBOARD TAB ==================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center"><LayoutGrid className="w-5 h-5 text-blue-400" /></div>
                <div><p className="text-2xl font-bold text-white">{totalMosques}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider">Total</p></div>
              </div>
            </div>
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center"><Check className="w-5 h-5 text-emerald-400" /></div>
                <div><p className="text-2xl font-bold text-emerald-400">{withAdmin}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider">With Admin</p></div>
              </div>
            </div>
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center"><Pause className="w-5 h-5 text-amber-400" /></div>
                <div><p className="text-2xl font-bold text-amber-400">{pausedCount}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider">Paused</p></div>
              </div>
            </div>
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center"><Tag className="w-5 h-5 text-purple-400" /></div>
                <div><p className="text-2xl font-bold text-purple-400">{activeFilters}</p><p className="text-[10px] text-gray-500 uppercase tracking-wider">Filters</p></div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/40">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">No Admin Assigned</p>
            <div className="space-y-1.5">
              {locations?.filter(l => !l.admin_username).slice(0, 5).map(l => (
                <div key={l.id} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-300 truncate">{l.mosque_name}</span>
                  <span className="text-[10px] text-gray-600">{l.district}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== SETTINGS TAB (Hijri + Ramadan) ==================== */}
      {activeTab === 'settings' && (
        <div className="space-y-3">
          {/* App support / developer donations */}
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/40">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center"><Heart className="w-5 h-5 text-indigo-400" /></div>
              <div>
                <p className="text-sm font-bold text-white">App Support Donations</p>
                <p className="text-[10px] text-gray-500">Shown on home + every mosque page with a disclaimer</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                <span className="text-sm text-gray-300">{appDonation.enabled ? 'Visible to users' : 'Hidden'}</span>
                <button
                  onClick={() => setAppDonation((p) => ({ ...p, enabled: !p.enabled }))}
                  className={`w-12 h-7 rounded-full transition-colors ${appDonation.enabled ? 'bg-indigo-500' : 'bg-gray-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${appDonation.enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <input
                value={appDonation.upi}
                onChange={(e) => setAppDonation((p) => ({ ...p, upi: e.target.value }))}
                placeholder="UPI ID (e.g. name@okaxis)"
                className="w-full text-sm px-3 py-2.5 rounded-xl bg-gray-700/30 border border-gray-600/40 text-white placeholder-gray-500 outline-none focus:border-indigo-400"
              />
              <input
                value={appDonation.payee}
                onChange={(e) => setAppDonation((p) => ({ ...p, payee: e.target.value }))}
                placeholder="Payee name shown in UPI apps"
                className="w-full text-sm px-3 py-2.5 rounded-xl bg-gray-700/30 border border-gray-600/40 text-white placeholder-gray-500 outline-none focus:border-indigo-400"
              />
              <textarea
                value={appDonation.note}
                onChange={(e) => setAppDonation((p) => ({ ...p, note: e.target.value }))}
                rows={3}
                placeholder="Message shown to users (why support is needed)"
                className="w-full text-sm px-3 py-2.5 rounded-xl bg-gray-700/30 border border-gray-600/40 text-white placeholder-gray-500 outline-none focus:border-indigo-400"
              />
              <button
                onClick={saveAppDonation}
                disabled={savingAppDonation}
                className="w-full py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Save className="w-4 h-4" /> {savingAppDonation ? 'Saving…' : 'Save app support settings'}
              </button>
            </div>
          </div>

          {/* Weekly prayer-time change watcher */}
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/40">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center"><Clock className="w-5 h-5 text-sky-400" /></div>
              <div>
                <p className="text-sm font-bold text-white">Prayer Time Change Alerts</p>
                <p className="text-[10px] text-gray-500">Detects changes per date range and pushes old → new times</p>
              </div>
            </div>
            <button
              onClick={runChangeWatch}
              disabled={runningWatch}
              className="w-full py-2.5 rounded-xl bg-sky-500 text-white text-sm font-bold disabled:opacity-60"
            >
              {runningWatch ? 'Checking all mosques…' : 'Run change check now'}
            </button>
          </div>


          {/* Ramadan Mode */}
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/40">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center"><Moon className="w-5 h-5 text-purple-400" /></div>
              <div>
                <p className="text-sm font-bold text-white">Ramadan Mode</p>
                <p className="text-[10px] text-gray-500">Toggle Ramadan mode for all users</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
              <span className="text-sm text-gray-300">{isRamadan ? 'Active' : 'Inactive'}</span>
              <button
                onClick={() => handleRamadanToggle(!isRamadan)}
                className={`w-12 h-7 rounded-full transition-colors ${isRamadan ? 'bg-purple-500' : 'bg-gray-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${isRamadan ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>

          {/* Hijri Date Adjustment */}
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/40">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center"><Calendar className="w-5 h-5 text-teal-400" /></div>
              <div>
                <p className="text-sm font-bold text-white">Hijri Date Adjustment</p>
                <p className="text-[10px] text-gray-500">Adjust for local moon sighting</p>
              </div>
            </div>
            <HijriAdjustment />
          </div>

          {/* Sahar End Time */}
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center"><Clock className="w-5 h-5 text-amber-400" /></div>
                <div>
                  <p className="text-sm font-bold text-white">Sahar End Time</p>
                  <p className="text-[10px] text-gray-500">Show sahar end time display</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const current = localStorage.getItem('showSahar') !== 'false';
                  localStorage.setItem('showSahar', (!current).toString());
                  toast.success(!current ? 'Sahar End enabled' : 'Sahar End disabled');
                }}
                className={`w-12 h-7 rounded-full transition-colors ${localStorage.getItem('showSahar') !== 'false' ? 'bg-amber-500' : 'bg-gray-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-1 ${localStorage.getItem('showSahar') !== 'false' ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MOSQUES TAB ==================== */}
      {activeTab === 'mosques' && (
        <div className="space-y-3">
          {/* Add Mosque Button */}
          <button
            onClick={() => { setShowAddMosque(!showAddMosque); setAddMosqueStep('info'); setNewMosqueId(null); setWizardRangeIndex(0); }}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" /> Add New Mosque
          </button>

          {showAddMosque && addMosqueStep === 'info' && (
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700/40 p-4 space-y-3">
              <h3 className="text-sm font-bold text-white">Step 1: Mosque Info</h3>
              <input type="text" placeholder="Mosque Name" value={newMosque.mosque_name} onChange={e => setNewMosque(p => ({ ...p, mosque_name: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-700/50 border border-gray-600/50 rounded-xl text-sm text-white placeholder-gray-500" />
              <input type="text" placeholder="District" value={newMosque.district} onChange={e => setNewMosque(p => ({ ...p, district: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-700/50 border border-gray-600/50 rounded-xl text-sm text-white placeholder-gray-500" />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" step="any" placeholder="Latitude" value={newMosque.latitude} onChange={e => setNewMosque(p => ({ ...p, latitude: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-700/50 border border-gray-600/50 rounded-xl text-sm text-white placeholder-gray-500" />
                <input type="number" step="any" placeholder="Longitude" value={newMosque.longitude} onChange={e => setNewMosque(p => ({ ...p, longitude: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-700/50 border border-gray-600/50 rounded-xl text-sm text-white placeholder-gray-500" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddMosqueInfo} disabled={addingMosque} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs h-9">
                  {addingMosque ? 'Adding...' : 'Next: Add Prayer Times →'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddMosque(false)} className="rounded-xl text-xs h-9 border-gray-600 text-gray-400">Cancel</Button>
              </div>
            </div>
          )}

          {showAddMosque && addMosqueStep === 'prayer-times' && (
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-emerald-500/30 p-4 space-y-3">
              <h3 className="text-sm font-bold text-white">Step 2: Prayer Times for {newMosque.mosque_name}</h3>
              <div className="flex items-center gap-2">
                <select value={wizardMonth} onChange={e => setWizardMonth(e.target.value)} className="flex-1 px-2 py-2 bg-gray-700/50 border border-gray-600/50 rounded-xl text-sm text-white">
                  {monthNames.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Progress indicator */}
              <div className="flex gap-1">
                {allDateRanges.map((r, i) => (
                  <div key={r} className={`flex-1 h-1.5 rounded-full ${i <= wizardRangeIndex ? 'bg-emerald-500' : 'bg-gray-700'}`} />
                ))}
              </div>

              <p className="text-xs text-emerald-400 font-bold">
                Range {wizardRangeIndex + 1}/{allDateRanges.length}: {currentWizardRange} {wizardMonth}
              </p>

              {/* Prayer time fields */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {wizardFields.map(group => (
                  <div key={group.title} className="rounded-xl p-2.5 border bg-gray-700/30 border-gray-600/30">
                    <p className="text-xs font-bold mb-2 text-gray-300">{group.title}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {group.fields.map(f => (
                        <TimePicker12h
                          key={f.key}
                          label={f.label}
                          value={(wizardPrayerTimes[currentWizardRange] || {})[f.key] || ''}
                          onChange={v => updateWizardField(f.key, v)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                {wizardRangeIndex > 0 && (
                  <Button variant="outline" onClick={() => setWizardRangeIndex(prev => prev - 1)} className="rounded-xl text-xs h-9 border-gray-600 text-gray-400">← Back</Button>
                )}
                <Button onClick={handleSaveWizardRange} disabled={savingPrayerTimes} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs h-9">
                  {savingPrayerTimes ? 'Saving...' : wizardRangeIndex < allDateRanges.length - 1 ? `Save & Next →` : 'Save & Finish ✓'}
                </Button>
                <Button variant="outline" onClick={() => { setShowAddMosque(false); setAddMosqueStep('info'); }} className="rounded-xl text-xs h-9 border-gray-600 text-gray-400">Skip</Button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search mosques..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-gray-800/60 border border-gray-700/40 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>

          {/* Mosque list */}
          <div className="space-y-2">
            {filtered.map(loc => {
              const isPaused = loc.is_paused;
              return (
                <div key={loc.id} className={`bg-gray-800/60 backdrop-blur-sm rounded-2xl border p-3 transition-all ${isPaused ? 'border-amber-500/30 opacity-70' : 'border-gray-700/40'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{loc.mosque_name}</p>
                      <p className="text-xs text-gray-500">{loc.district}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {loc.admin_username ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium border border-emerald-500/30">Has Admin</span>
                      ) : (
                        <span className="text-[10px] bg-gray-700/50 text-gray-500 px-2 py-0.5 rounded-full font-medium border border-gray-600/30">No Admin</span>
                      )}
                      {isPaused && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium border border-amber-500/30">Paused</span>}
                    </div>
                  </div>

                  {loc.admin_username && editingId !== loc.id && (
                    <div className="mt-2 p-2 bg-gray-700/30 rounded-lg">
                      <p className="text-xs text-gray-500">Username: <span className="font-medium text-gray-300">{loc.admin_username}</span></p>
                    </div>
                  )}

                  {editingId === loc.id ? (
                    <div className="mt-2 space-y-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                      <input type="text" placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-sm text-white placeholder-gray-500" />
                      <div className="relative">
                        <input
                          type={showPasswords[loc.id] ? 'text' : 'password'}
                          placeholder="Password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-sm text-white placeholder-gray-500 pr-10"
                        />
                        <button onClick={() => setShowPasswords(p => ({ ...p, [loc.id]: !p[loc.id] }))} className="absolute right-2 top-1/2 -translate-y-1/2">
                          {showPasswords[loc.id] ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleSetCredentials(loc.id)} disabled={loading} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs h-8">
                          <Save className="w-3 h-3 mr-1" /> Save
                        </Button>
                        <Button variant="outline" onClick={() => { setEditingId(null); setNewUsername(''); setNewPassword(''); }} className="rounded-lg text-xs h-8 border-gray-600 text-gray-400">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      <button
                        onClick={() => { setEditingId(loc.id); setNewUsername(loc.admin_username || ''); setNewPassword(''); }}
                        className="flex-1 py-1.5 bg-blue-500/15 text-blue-400 rounded-lg text-xs font-medium flex items-center justify-center gap-1 border border-blue-500/20"
                      >
                        <Plus className="w-3 h-3" /> {loc.admin_username ? 'Edit' : 'Add Admin'}
                      </button>
                      <button
                        onClick={() => toggleAdminPause(loc)}
                        disabled={loading}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1 border ${loc.is_paused ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'}`}
                      >
                        {loc.is_paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                        {loc.is_paused ? 'Resume' : 'Pause'}
                      </button>
                      {loc.admin_username && (
                        <button onClick={() => handleDeleteCredentials(loc.id)} disabled={loading} title="Remove Admin" className="py-1.5 px-3 bg-red-500/15 text-red-400 rounded-lg text-xs font-medium border border-red-500/20">
                          <Shield className="w-3 h-3" />
                        </button>
                      )}
                      <button onClick={() => handleDeleteMosque(loc)} disabled={loading} title="Delete Mosque" className="py-1.5 px-3 bg-red-500/15 text-red-400 rounded-lg text-xs font-medium border border-red-500/20 hover:bg-red-500/30">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== FILTERS TAB ==================== */}
      {activeTab === 'filters' && (
        <div className="space-y-3">
          <button
            onClick={() => setShowAddFilter(!showAddFilter)}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
          >
            <Plus className="w-4 h-4" /> Add New Filter
          </button>

          {showAddFilter && (
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-4 space-y-3">
              <h3 className="text-sm font-bold text-white">Create Custom Filter</h3>
              <input type="text" placeholder="Filter name" value={newFilter.name} onChange={e => setNewFilter(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-700/50 border border-gray-600/50 rounded-xl text-sm text-white placeholder-gray-500" />
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Icon</p>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_OPTIONS.map(emoji => (
                    <button key={emoji} onClick={() => setNewFilter(p => ({ ...p, icon: emoji }))} className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${newFilter.icon === emoji ? 'bg-purple-500/30 border-2 border-purple-400 scale-110' : 'bg-gray-700/50 border border-gray-600/30'}`}>{emoji}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Color</p>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c.name} onClick={() => setNewFilter(p => ({ ...p, color: c.name }))} className={`w-8 h-8 rounded-lg ${c.bg} transition-all ${newFilter.color === c.name ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-110' : 'opacity-60 hover:opacity-100'}`} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddFilter} disabled={manageFilter.isPending} className="flex-1 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs h-9">{manageFilter.isPending ? 'Creating...' : 'Create Filter'}</Button>
                <Button variant="outline" onClick={() => setShowAddFilter(false)} className="rounded-xl text-xs h-9 border-gray-600 text-gray-400">Cancel</Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {allFilters?.map(filter => (
              <div key={filter.id} className={`bg-gray-800/60 backdrop-blur-sm rounded-2xl border p-3 transition-all ${filter.is_active ? 'border-gray-700/40' : 'border-gray-700/20 opacity-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{filter.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{filter.name}</p>
                      <p className="text-[10px] text-gray-500">{filter.is_active ? 'Active' : 'Inactive'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => handleToggleFilter(filter)} className={`p-1.5 rounded-lg ${filter.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700/50 text-gray-500'}`}>
                      {filter.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => handleDeleteFilter(filter)} className="p-1.5 bg-red-500/15 text-red-400 rounded-lg border border-red-500/20">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {(!allFilters || allFilters.length === 0) && (
              <div className="text-center py-8">
                <Tag className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No filters created yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
