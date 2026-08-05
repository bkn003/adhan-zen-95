import React, { useEffect, useState } from 'react';
import { Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/** Public route hit by the Supabase recovery email link. */
const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash || '';
    const isRecovery = hash.includes('type=recovery');
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (isRecovery && session)) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Password updated');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4">
          <p className="text-sm font-extrabold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Set a new password
          </p>
          <p className="text-[11px] opacity-90 mt-0.5">
            {ready ? 'Choose a password with at least 6 characters.' : 'Open this page from the reset link in your email.'}
          </p>
        </div>
        <form onSubmit={submit} className="p-4 space-y-2">
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-emerald-400"
            />
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-emerald-400"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !ready}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Update password
          </button>
          <button type="button" onClick={() => navigate('/')} className="w-full text-[11px] text-gray-500 pt-1">
            Back to app
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
