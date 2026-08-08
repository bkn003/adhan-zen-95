import React, { useState } from 'react';
import { Shield, LogIn, Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { adminSignIn, adminSignUp } from '@/utils/adminApi';

interface Props {
  title: string;
  subtitle: string;
  /** Dark theme for the super admin panel, light for the mosque admin panel. */
  variant?: 'dark' | 'light';
  /** Super admin accounts are self-serve; mosque admin accounts are created by a super admin. */
  allowSignUp?: boolean;
  onSignedIn: () => void | Promise<void>;
}

/** Shared email + password card backed by real Supabase authentication. */
export const AdminAuthCard: React.FC<Props> = ({
  title,
  subtitle,
  variant = 'light',
  allowSignUp = false,
  onSignedIn,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const dark = variant === 'dark';
  const inputCls = dark
    ? 'w-full pl-9 pr-10 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50'
    : 'w-full pl-9 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30';

  const submit = async () => {
    setBusy(true);
    setNotice(null);
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice('Password reset link sent. Check your inbox.');
        return;
      }
      if (mode === 'signup') {
        const { needsConfirmation } = await adminSignUp(email, password);
        if (needsConfirmation) {
          setNotice('Account created. Confirm your email, then sign in.');
          return;
        }
        await onSignedIn();
        return;
      }
      await adminSignIn(email, password);
      await onSignedIn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10">
      <div
        className={
          dark
            ? 'bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-700/50 shadow-2xl'
            : 'bg-white rounded-3xl p-6 border border-gray-200 shadow-lg'
        }
      >
        <div className="text-center mb-6">
          <div
            className={`w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-lg ${
              dark
                ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/30'
                : 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/25'
            }`}
          >
            {dark ? <Shield className="w-8 h-8 text-white" /> : <LogIn className="w-8 h-8 text-white" />}
          </div>
          <h2 className={`text-xl font-bold ${dark ? 'text-white' : 'text-gray-800'}`}>{title}</h2>
          <p className={`text-xs mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>
        </div>

        {notice && (
          <div className="mb-3 text-xs rounded-xl p-3 bg-emerald-50 border border-emerald-100 text-emerald-800">
            {notice}
          </div>
        )}

        <div className="space-y-3">
          <div className="relative">
            <Mail className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${dark ? 'text-gray-400' : 'text-gray-400'}`} />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </div>

          {mode !== 'forgot' && (
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={show ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                className={inputCls}
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {show ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
          )}

          <Button
            onClick={submit}
            disabled={busy || !email || (mode !== 'forgot' && password.length < 6)}
            className={`w-full text-white rounded-xl py-3 h-auto font-semibold ${
              dark
                ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/25'
                : 'bg-gradient-to-r from-emerald-500 to-green-600'
            }`}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
          </Button>

          <div className={`flex items-center justify-between text-[11px] ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
            {mode === 'signin' ? (
              <>
                {allowSignUp ? (
                  <button onClick={() => setMode('signup')} className="font-semibold">
                    Create account
                  </button>
                ) : (
                  <span>Accounts are issued by the super admin</span>
                )}
                <button onClick={() => setMode('forgot')}>Forgot password?</button>
              </>
            ) : (
              <button onClick={() => setMode('signin')} className="font-semibold">
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
