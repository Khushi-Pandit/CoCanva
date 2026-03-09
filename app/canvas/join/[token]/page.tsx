'use client';
// FILE: app/canvas/join/[token]/page.tsx
// Resolves share token → saves to sessionStorage → redirects to canvas
// If not logged in → goes to login, then returns here after login

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '../../../../lib/firebase';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token  = params.token as string;
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setErrMsg('Invalid invite link.'); return; }

    // Step 1: Resolve the token to get canvasId (no auth needed)
    const resolve = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas/join/${token}`
        );
        if (!res.ok) {
          setStatus('error');
          setErrMsg('This invite link is invalid or has expired.');
          return;
        }
        const { canvasId } = await res.json();

        // Step 2: Store token in sessionStorage for canvas page to use
        sessionStorage.setItem(`share_token_${canvasId}`, token);

        // Step 3: Check if user is logged in
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
          unsubscribe();
          if (user) {
            // Already logged in → go straight to canvas
            router.replace(`/canvas/${canvasId}`);
          } else {
            // Not logged in → go to login, pass redirect back here
            // After login, user will come back to this join URL
            // and then be redirected to canvas
            router.replace(`/login?redirect=/canvas/join/${token}`);
          }
        });
      } catch {
        setStatus('error');
        setErrMsg('Network error. Check your connection.');
      }
    };

    resolve();
  }, [token, router]);

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full mx-4 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4m0 4h.01M5.07 19H19a2 2 0 001.75-2.96l-6.97-12a2 2 0 00-3.5 0l-6.97 12A2 2 0 005.07 19z"
                stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-800 mb-2">Invalid Link</h2>
          <p className="text-sm text-slate-500 mb-6">{errMsg}</p>
          <button onClick={() => router.push('/dashboard')}
            className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"/>
        <p className="text-sm font-medium text-slate-500">Joining canvas…</p>
      </div>
    </div>
  );
}