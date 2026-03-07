'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth } from '../../../lib/firebase';

// This page handles: /canvas/join/[token]
// It resolves the token → canvasId + role, then redirects to /canvas/[canvasId]?role=xxx
export default function JoinPage() {
  const params   = useParams();
  const router   = useRouter();
  const token    = params.token as string;
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [msg,    setMsg]    = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) { router.push('/login'); return; }

      try {
        const firebaseToken = await user.getIdToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas/join/${token}`,
          { headers: { Authorization: `Bearer ${firebaseToken}` } }
        );

        if (!res.ok) {
          const data = await res.json();
          setStatus('error');
          setMsg(data.message || 'Invalid or expired link');
          return;
        }

        const { canvasId, role } = await res.json();
        // Redirect to the actual canvas page with role in URL
        router.replace(`/canvas/${canvasId}?role=${role}`);
      } catch {
        setStatus('error');
        setMsg('Something went wrong. Please try again.');
      }
    });

    return () => unsubscribe();
  }, [token]);

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-sm w-full mx-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Link Invalid</h2>
          <p className="text-sm text-slate-500 mb-6">{msg}</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-emerald-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-emerald-700">Joining canvas…</p>
      </div>
    </div>
  );
}