'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { canvasApi } from '@/lib/api/canvas.api';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params.token);
  const { firebaseUser, loading: authLoading } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'redirect' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) {
      // Store token in sessionStorage, redirect to login
      sessionStorage.setItem('pendingJoinToken', token);
      router.replace(`/login?next=/canvas/join/${token}`);
      return;
    }
    (async () => {
      try {
        const result = await canvasApi.resolveShareToken(token);
        setStatus('redirect');
        router.replace(`/canvas/${result.canvasId}?shareToken=${token}`);
      } catch (err) {
        setError('This invite link is invalid or has expired.');
        setStatus('error');
      }
    })();
  }, [firebaseUser, authLoading, token, router]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={22} className="text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-slate-800 mb-2">Invalid Invite Link</h1>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-all">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="text-emerald-500 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Joining canvas…</p>
      </div>
    </div>
  );
}
