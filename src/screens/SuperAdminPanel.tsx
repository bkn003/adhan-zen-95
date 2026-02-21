import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Eye, EyeOff, Save, Trash2, Plus, Search, Pause, Play, EyeOff as EyeOffIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocations } from '@/hooks/useLocations';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';

const SUPABASE_URL = "https://lhufqnokmdqkvzcxqwkl.supabase.co";

interface SuperAdminPanelProps {
  onBack: () => void;
}

export const SuperAdminPanel = ({ onBack }: SuperAdminPanelProps) => {
  const [superPassword, setSuperPassword] = useState('');
  const [showSuperPass, setShowSuperPass] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [pausedAdmins, setPausedAdmins] = useState<Record<string, boolean>>({});
  const [hiddenMosques, setHiddenMosques] = useState<Record<string, boolean>>({});
  const { t } = useLanguage();

  const { data: locations, refetch: refetchLocations } = useLocations();

  // Load paused/hidden state from localStorage (backed by edge function in production)
  useEffect(() => {
    const savedPaused = localStorage.getItem('pausedAdmins');
    if (savedPaused) setPausedAdmins(JSON.parse(savedPaused));
    const savedHidden = localStorage.getItem('hiddenMosques');
    if (savedHidden) setHiddenMosques(JSON.parse(savedHidden));
  }, []);

  const handleSuperLogin = () => {
    if (superPassword === 'AdhanZen@SuperAdmin2025') {
      setIsAuthenticated(true);
      toast.success('Super Admin authenticated');
    } else {
      toast.error('Invalid super admin password');
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
        action: 'set_credentials',
        location_id: locationId,
        username: newUsername,
        password: newPassword,
      };

      if (loc?.admin_username) {
        body.action = 'super_set_credentials';
      }

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
      refetchLocations();
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
        body: JSON.stringify({
          action: 'super_delete_credentials',
          location_id: locationId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Credentials removed!');
      refetchLocations();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminPause = (locationId: string) => {
    const updated = { ...pausedAdmins, [locationId]: !pausedAdmins[locationId] };
    setPausedAdmins(updated);
    localStorage.setItem('pausedAdmins', JSON.stringify(updated));
    toast.success(updated[locationId] ? 'Admin paused' : 'Admin resumed');
  };

  const toggleMosqueVisibility = (locationId: string) => {
    const updated = { ...hiddenMosques, [locationId]: !hiddenMosques[locationId] };
    setHiddenMosques(updated);
    localStorage.setItem('hiddenMosques', JSON.stringify(updated));
    toast.success(updated[locationId] ? 'Mosque hidden from users' : 'Mosque visible to users');
  };

  // Add new mosque
  const [showAddMosque, setShowAddMosque] = useState(false);
  const [newMosque, setNewMosque] = useState({ mosque_name: '', district: '', latitude: '', longitude: '' });
  const [addingMosque, setAddingMosque] = useState(false);

  const handleAddMosque = async () => {
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
      toast.success('Mosque added!');
      setShowAddMosque(false);
      setNewMosque({ mosque_name: '', district: '', latitude: '', longitude: '' });
      refetchLocations();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAddingMosque(false);
    }
  };

  const filtered = locations?.filter(l =>
    l.mosque_name.toLowerCase().includes(search.toLowerCase()) ||
    l.district.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Stats
  const totalMosques = locations?.length || 0;
  const withAdmin = locations?.filter(l => l.admin_username).length || 0;
  const pausedCount = Object.values(pausedAdmins).filter(Boolean).length;
  const hiddenCount = Object.values(hiddenMosques).filter(Boolean).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/30 p-4 pb-28">
        <button onClick={onBack} className="p-2 mb-4">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="max-w-sm mx-auto mt-10">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-red-100 rounded-2xl mx-auto mb-3 flex items-center justify-center">
                <Shield className="w-7 h-7 text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">Super Admin</h2>
              <p className="text-xs text-gray-500 mt-1">Manage mosque admin credentials & controls</p>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showSuperPass ? 'text' : 'password'}
                  placeholder="Super Admin Password"
                  value={superPassword}
                  onChange={e => setSuperPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSuperLogin()}
                  className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
                />
                <button type="button" onClick={() => setShowSuperPass(!showSuperPass)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showSuperPass ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
              <Button
                onClick={handleSuperLogin}
                disabled={!superPassword}
                className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl py-3 h-auto font-semibold"
              >
                Authenticate
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/30 p-3 pb-28 space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="p-2">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-sm font-bold text-gray-800">Super Admin Panel</h2>
        <div className="w-9" />
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white rounded-xl p-2 text-center border border-gray-100">
          <p className="text-lg font-bold text-gray-800">{totalMosques}</p>
          <p className="text-[9px] text-gray-500">Mosques</p>
        </div>
        <div className="bg-white rounded-xl p-2 text-center border border-gray-100">
          <p className="text-lg font-bold text-emerald-600">{withAdmin}</p>
          <p className="text-[9px] text-gray-500">With Admin</p>
        </div>
        <div className="bg-white rounded-xl p-2 text-center border border-gray-100">
          <p className="text-lg font-bold text-amber-600">{pausedCount}</p>
          <p className="text-[9px] text-gray-500">Paused</p>
        </div>
        <div className="bg-white rounded-xl p-2 text-center border border-gray-100">
          <p className="text-lg font-bold text-red-600">{hiddenCount}</p>
          <p className="text-[9px] text-gray-500">Hidden</p>
        </div>
      </div>

      {/* Add Mosque Button */}
      <button
        onClick={() => setShowAddMosque(!showAddMosque)}
        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Add New Mosque
      </button>

      {showAddMosque && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-800">Add New Mosque</h3>
          <input type="text" placeholder="Mosque Name" value={newMosque.mosque_name} onChange={e => setNewMosque(p => ({ ...p, mosque_name: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
          <input type="text" placeholder="District" value={newMosque.district} onChange={e => setNewMosque(p => ({ ...p, district: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="any" placeholder="Latitude" value={newMosque.latitude} onChange={e => setNewMosque(p => ({ ...p, latitude: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            <input type="number" step="any" placeholder="Longitude" value={newMosque.longitude} onChange={e => setNewMosque(p => ({ ...p, longitude: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddMosque} disabled={addingMosque} className="flex-1 bg-emerald-500 text-white rounded-xl text-xs h-9">
              {addingMosque ? 'Adding...' : 'Add Mosque'}
            </Button>
            <Button variant="outline" onClick={() => setShowAddMosque(false)} className="rounded-xl text-xs h-9">Cancel</Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search mosques..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
        />
      </div>

      {/* Mosque list */}
      <div className="space-y-2">
        {filtered.map(loc => {
          const isPaused = pausedAdmins[loc.id];
          const isHidden = hiddenMosques[loc.id];

          return (
            <div key={loc.id} className={`bg-white rounded-xl border p-3 transition-all ${isHidden ? 'border-red-200 opacity-60' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{loc.mosque_name}</p>
                  <p className="text-xs text-gray-500">{loc.district}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {loc.admin_username ? (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isPaused
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                      }`}>
                      {isPaused ? 'Paused' : 'Active'}
                    </span>
                  ) : (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                      No Admin
                    </span>
                  )}
                  {isHidden && (
                    <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                      Hidden
                    </span>
                  )}
                </div>
              </div>

              {loc.admin_username && editingId !== loc.id && (
                <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">
                    Username: <span className="font-medium text-gray-700">{loc.admin_username}</span>
                  </p>
                </div>
              )}

              {editingId === loc.id ? (
                <div className="mt-2 space-y-2 p-2 bg-red-50/50 rounded-lg">
                  <input
                    type="text"
                    placeholder="Username"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <div className="relative">
                    <input
                      type={showPasswords[loc.id] ? 'text' : 'password'}
                      placeholder="Password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm pr-10"
                    />
                    <button
                      onClick={() => setShowPasswords(p => ({ ...p, [loc.id]: !p[loc.id] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      {showPasswords[loc.id] ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSetCredentials(loc.id)}
                      disabled={loading}
                      className="flex-1 bg-red-500 text-white rounded-lg text-xs h-8"
                    >
                      <Save className="w-3 h-3 mr-1" /> Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setEditingId(null); setNewUsername(''); setNewPassword(''); }}
                      className="rounded-lg text-xs h-8"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <button
                    onClick={() => {
                      setEditingId(loc.id);
                      setNewUsername(loc.admin_username || '');
                      setNewPassword('');
                    }}
                    className="flex-1 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> {loc.admin_username ? 'Edit' : 'Add'}
                  </button>

                  {/* Pause/Resume Admin */}
                  {loc.admin_username && (
                    <button
                      onClick={() => toggleAdminPause(loc.id)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-medium flex items-center gap-1 ${isPaused
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                        }`}
                    >
                      {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      {isPaused ? 'Resume' : 'Pause'}
                    </button>
                  )}

                  {/* Toggle Visibility */}
                  <button
                    onClick={() => toggleMosqueVisibility(loc.id)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-medium flex items-center gap-1 ${isHidden
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-600'
                      }`}
                  >
                    {isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {isHidden ? 'Show' : 'Hide'}
                  </button>

                  {/* Delete credentials */}
                  {loc.admin_username && (
                    <button
                      onClick={() => handleDeleteCredentials(loc.id)}
                      className="py-1.5 px-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
