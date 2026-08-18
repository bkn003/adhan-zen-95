import React, { useState } from 'react';
import { X, Mail, Lock, LogIn, ShieldCheck, Loader2, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Mode = 'signin' | 'signup' | 'forgot';

/**
 * Hybrid gate: browsing stays open, but personalised actions (reviews, RSVP,
 * follows, notifications, tracker) open this sheet.
 */
export const AuthSheet: React.FC = () => {
  const { authPrompt, closeAuth } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  if (!authPrompt.open) return null;

  /** Anonymous sessions block real credential sign-in, so drop them first. */
  const clearAnonSession = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user && (data.user as { is_anonymous?: boolean }).is_anonymous) {
      await supabase.auth.signOut();
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      await clearAnonSession();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Google sign-in failed');
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await clearAnonSession();

      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent('Password reset link sent. Check your inbox.');
        return;
      }

      if (mode === 'signup') {
        const cleanPhone = phone.replace(/[^\d+]/g, '');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name || email.split('@')[0], phone: cleanPhone || null },
          },
        });
        if (error) throw error;

        // Supabase returns a user with no identities when the email already exists.
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          setMode('signin');
          toast.info('This email already has an account — sign in with your password.');
          return;
        }

        if (!data.session) {
          // Try signing in straight away: works when email confirmation is off.
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (!signInErr) {
            if (cleanPhone) await savePhone(cleanPhone);
            toast.success('Signed in');
            closeAuth();
            return;
          }
          setSent(
            `We sent a confirmation link to ${email}. Open it (check spam/promotions), then come back and sign in with the same email and password.`,
          );
          return;
        }
        if (cleanPhone) await savePhone(cleanPhone);
        toast.success('Signed in');
        closeAuth();
        return;
      }


      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Signed in');
      closeAuth();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeAuth}>
      <div
        className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-sm font-extrabold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Sign in to continue
            </p>
            <p className="text-[11px] opacity-90 mt-0.5">
              {authPrompt.reason || 'Verified accounts keep reviews, RSVPs and notifications trustworthy.'}
            </p>
          </div>
          <button onClick={closeAuth} className="p-2 bg-white/20 rounded-xl shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {sent ? (
            <div className="space-y-2">
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl p-3">{sent}</div>
              <button
                onClick={async () => {
                  setBusy(true);
                  try {
                    const { error } = await supabase.auth.resend({
                      type: 'signup',
                      email,
                      options: { emailRedirectTo: window.location.origin },
                    });
                    if (error) throw error;
                    toast.success('Confirmation email sent again');
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Could not resend the email');
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                className="w-full py-2.5 rounded-xl border border-emerald-200 text-emerald-700 text-sm font-semibold disabled:opacity-60"
              >
                Resend confirmation email
              </button>
              <button
                onClick={() => { setSent(null); setMode('signin'); setPassword(''); }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold"
              >
                Go to sign in
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={google}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 active:bg-gray-50 disabled:opacity-60"
              >
                <img src="https://www.google.com/favicon.ico" alt="" className="w-4 h-4" />
                Continue with Google
              </button>

              <div className="flex items-center gap-2">
                <span className="h-px flex-1 bg-gray-100" />
                <span className="text-[10px] uppercase tracking-wide text-gray-400">or email</span>
                <span className="h-px flex-1 bg-gray-100" />
              </div>

              <form onSubmit={submit} className="space-y-2">
                {mode === 'signup' && (
                  <>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-emerald-400"
                    />
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        inputMode="tel"
                        maxLength={16}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ''))}
                        placeholder="Mobile number (optional)"
                        className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-emerald-400"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 -mt-1">
                      Shared only with your mosque admin when you mark jamaat attendance.
                    </p>
                  </>
                )}
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-emerald-400"
                  />
                </div>
                {mode !== 'forgot' && (
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-emerald-400"
                    />
                  </div>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  {mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
                </button>
              </form>

              <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                {mode === 'signin' ? (
                  <>
                    <button onClick={() => setMode('signup')} className="font-semibold text-emerald-700">Create account</button>
                    <button onClick={() => setMode('forgot')}>Forgot password?</button>
                  </>
                ) : (
                  <button onClick={() => setMode('signin')} className="font-semibold text-emerald-700">Back to sign in</button>
                )}
              </div>
            </>
          )}

          <p className="text-[10px] text-gray-400 text-center pt-1 pb-1">
            Prayer times stay free to browse without an account.
          </p>
        </div>
      </div>
    </div>
  );
};
