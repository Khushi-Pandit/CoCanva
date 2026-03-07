'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase';

// /canvas/join/[token]
// Requires login. Resolves token → canvasId + role → redirects to /canvas/[canvasId]?role=xxx
export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token  = params.token as string;

  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      // Must be logged in
      if (!user) {
        router.replace(`/login?redirect=/canvas/join/${token}`);
        return;
      }

      try {
        const firebaseToken = await user.getIdToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas/join/${token}`,
          { headers: { Authorization: `Bearer ${firebaseToken}` } }
        );

        if (res.status === 401) { router.replace('/login'); return; }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.message || 'Invalid or expired link.');
          return;
        }

        const { canvasId, role } = await res.json();
        // Redirect to canvas with role encoded in URL
        router.replace(`/canvas/${canvasId}?role=${role}`);
      } catch {
        setError('Network error. Please check your connection.');
      }
    });

    return () => unsubscribe();
  }, [token]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full mx-4 text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-800 mb-2">Link Invalid</h2>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/login')}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-emerald-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-emerald-700">Joining canvas…</p>
      </div>
    </div>
  );
}