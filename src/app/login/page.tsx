'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth.store';
import { Eye, EyeOff, Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

type View = 'login' | 'forgot' | 'reset-sent';

function getFirebaseError(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later or reset your password.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support.';
    case 'auth/popup-closed-by-user':
      return '';
    case 'auth/popup-blocked':
      return 'Popup was blocked. Allow popups for this site and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/cancelled-popup-request':
      return '';
    default:
      return 'Sign-in failed. Please try again.';
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { firebaseUser, loading: authLoading } = useAuthStore();
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect already-logged-in users to dashboard
  useEffect(() => {
    if (!authLoading && firebaseUser) router.replace('/dashboard');
  }, [authLoading, firebaseUser, router]);

  if (authLoading || firebaseUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50">
        <Loader2 size={28} className="text-emerald-500 animate-spin" />
      </div>
    );
  }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/dashboard');
    } catch (err: any) {
      const msg = getFirebaseError(err?.code ?? '');
      if (msg) setError(msg);
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true); setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      router.replace('/dashboard');
    } catch (err: any) {
      const msg = getFirebaseError(err?.code ?? '');
      if (msg) setError(msg);
    } finally { setGoogleLoading(false); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true); setError('');
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setView('reset-sent');
    } catch (err: any) {
      // For security, show success even if user not found
      if (err?.code === 'auth/user-not-found') {
        setView('reset-sent');
      } else {
        const msg = getFirebaseError(err?.code ?? '');
        if (msg) setError(msg);
      }
    } finally { setResetLoading(false); }
  };

  const switchToForgot = () => {
    setResetEmail(email);
    setError('');
    setView('forgot');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 p-4">
      {/* Decorative blobs */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="fixed bottom-0 left-0 w-80 h-80 bg-indigo-400/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="w-full max-w-sm animate-slide-up relative z-10">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-[13px]">DS</span>
            </div>
            <div>
              <p className="font-bold text-slate-900 leading-none">DrawSync</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Collaborative Canvas</p>
            </div>
          </div>

          {/* ── LOGIN VIEW ── */}
          {view === 'login' && (
            <>
              <h1 className="text-xl font-bold text-slate-900 mb-1">Welcome back</h1>
              <p className="text-sm text-slate-400 mb-6">Sign in to your workspace</p>

              {error && (
                <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}

              {/* Google */}
              <button onClick={handleGoogle} disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all mb-4 disabled:opacity-50 active:scale-[0.98]">
                {googleLoading ? <Loader2 size={16} className="animate-spin text-emerald-500" /> : (
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[11px] text-slate-400 font-medium">or email</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              <form onSubmit={handleEmail} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    required placeholder="you@company.com" className="input text-sm" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-semibold text-slate-600">Password</label>
                    <button
                      type="button"
                      onClick={switchToForgot}
                      className="text-[11px] text-emerald-600 hover:text-emerald-500 font-semibold transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                      required placeholder="••••••••" className="input text-sm pr-10" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-all shadow-sm shadow-emerald-200 disabled:opacity-50 active:scale-[0.98]">
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  Sign in
                </button>
              </form>

              <p className="mt-5 text-center text-xs text-slate-500">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-emerald-600 font-semibold hover:underline">Sign up free</Link>
              </p>
            </>
          )}

          {/* ── FORGOT PASSWORD VIEW ── */}
          {view === 'forgot' && (
            <>
              <button
                onClick={() => { setView('login'); setError(''); }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors mb-6 group font-medium"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                Back to sign in
              </button>

              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-5">
                <Mail size={22} className="text-emerald-600" />
              </div>

              <h1 className="text-xl font-bold text-slate-900 mb-2">Reset password</h1>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Enter the email linked to your account and we&apos;ll send a reset link instantly.
              </p>

              {error && (
                <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="you@company.com"
                    className="input text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-all shadow-sm shadow-emerald-200 disabled:opacity-50 active:scale-[0.98]"
                >
                  {resetLoading ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                  Send reset link
                </button>
              </form>
            </>
          )}

          {/* ── RESET SENT VIEW ── */}
          {view === 'reset-sent' && (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={28} className="text-emerald-500" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">Check your email</h1>
              <p className="text-sm text-slate-500 mb-1 leading-relaxed">We sent a password reset link to</p>
              <p className="text-sm font-bold text-slate-800 mb-6 break-all">{resetEmail}</p>
              
              <p className="text-xs text-slate-500 mb-8 leading-relaxed max-w-[280px] mx-auto">
                Didn&apos;t receive it? Check your spam folder, or{' '}
                <button
                  onClick={() => { setView('forgot'); setError(''); }}
                  className="text-emerald-600 hover:text-emerald-500 font-semibold transition-colors"
                >
                  try a different email
                </button>.
              </p>
              
              <button
                onClick={() => { setView('login'); setError(''); }}
                className="flex items-center gap-2 mx-auto text-sm text-slate-600 hover:text-slate-900 transition-colors font-semibold group"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
