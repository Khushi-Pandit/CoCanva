'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth.store';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { firebaseUser, loading: authLoading } = useAuthStore();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]       = useState('');

  // Redirect already-logged-in users to dashboard
  useEffect(() => {
    if (!authLoading && firebaseUser) router.replace('/dashboard');
  }, [authLoading, firebaseUser, router]);

  if (authLoading || firebaseUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-50">
        <Loader2 size={28} className="text-emerald-500 animate-spin" />
      </div>
    );
  }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      router.replace('/dashboard');
    } catch (err: unknown) {
      setError((err as {message?: string}).message ?? 'Sign-up failed');
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true); setError('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.replace('/dashboard');
    } catch (err: unknown) {
      setError((err as {message?: string}).message ?? 'Google sign-in failed');
    } finally { setGoogleLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-50 p-4">
      <div className="fixed top-0 left-0 w-96 h-96 bg-teal-400/8 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
      <div className="fixed bottom-0 right-0 w-80 h-80 bg-indigo-400/8 rounded-full blur-3xl translate-y-1/2 translate-x-1/2" />

      <div className="w-full max-w-sm animate-slide-up">
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-[13px]">DS</span>
            </div>
            <div>
              <p className="font-bold text-slate-900 leading-none">DrawSync</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Collaborative Canvas</p>
            </div>
          </div>

          <h1 className="text-xl font-bold text-slate-900 mb-1">Create account</h1>
          <p className="text-sm text-slate-400 mb-6">Start drawing together today</p>

          {error && (
            <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">{error}</div>
          )}

          <button onClick={handleGoogle} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all mb-4 disabled:opacity-50">
            {googleLoading ? <Loader2 size={16} className="animate-spin" /> : (
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
            <span className="text-[11px] text-slate-400">or email</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Full name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                required placeholder="Jane Smith" className="input text-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="you@company.com" className="input text-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  required placeholder="Min 6 characters" className="input text-sm pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-all shadow-sm shadow-emerald-200 disabled:opacity-50 active:scale-[0.98]">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Create account
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
