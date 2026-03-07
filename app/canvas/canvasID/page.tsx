/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth } from '../../../lib/firebase';

type AccessState = 'loading' | 'denied' | 'ready';

// /canvas/[canvasId]?role=editor
export default function CanvasPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const canvasId = params.canvasId as string;
  const urlRole  = (searchParams.get('role') as 'viewer' | 'editor' | 'voice') || 'editor';

  const [state,    setState]    = useState<AccessState>('loading');
  const [token,    setToken]    = useState('');
  const [userName, setUserName] = useState('');
  const [errMsg,   setErrMsg]   = useState('');

  // Dynamically import whiteboard to avoid SSR issues
  const [Whiteboard, setWhiteboard] = useState<any>(null);

  useEffect(() => {
    import('../page').then(m => setWhiteboard(() => m.default));
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      // 1. Not logged in → redirect to login
      if (!user) {
        router.replace(`/login?redirect=/canvas/${canvasId}?role=${urlRole}`);
        return;
      }

      try {
        const firebaseToken = await user.getIdToken();

        // 2. Verify access with backend
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas/${canvasId}`,
          { headers: { Authorization: `Bearer ${firebaseToken}` } }
        );

        if (res.status === 401) {
          // Token expired — re-login
          router.replace('/login');
          return;
        }

        if (res.status === 403) {
          setState('denied');
          setErrMsg("You don't have access to this canvas.");
          return;
        }

        if (res.status === 404) {
          setState('denied');
          setErrMsg('Canvas not found or the link has expired.');
          return;
        }

        if (!res.ok) {
          setState('denied');
          setErrMsg('Something went wrong. Please try again.');
          return;
        }

        // 3. Access confirmed
        setToken(firebaseToken);
        setUserName(user.displayName || user.email?.split('@')[0] || 'User');
        setState('ready');
      } catch {
        setState('denied');
        setErrMsg('Network error. Check your connection and try again.');
      }
    });

    return () => unsubscribe();
  }, [canvasId, urlRole]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-slate-500">Checking access…</p>
        </div>
      </div>
    );
  }

  // ── Access denied ──────────────────────────────────────────────────────────
  if (state === 'denied') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full mx-4 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4m0 4h.01M5.07 19H19a2 2 0 001.75-2.96l-6.97-12a2 2 0 00-3.5 0l-6.97 12A2 2 0 005.07 19z"
                stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500 mb-6">{errMsg}</p>
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

  // ── Whiteboard not loaded yet ──────────────────────────────────────────────
  if (!Whiteboard) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-9 h-9 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Render canvas ──────────────────────────────────────────────────────────
  return (
    <Whiteboard
      canvasId={canvasId}
      firebaseToken={token}
      userName={userName}
      userRole={urlRole}
    />
  );
}