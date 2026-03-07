'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { auth } from '../../../lib/firebase';
import InfiniteWhiteboard, { InfiniteWhiteboardProps } from '../../canvas/page';

type AccessState = 'loading' | 'denied' | 'ready';

function CanvasPageInner() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const canvasId = params.canvasId as string;
  const urlRole  = (searchParams.get('role') as 'viewer' | 'editor' | 'voice') || 'editor';

  const [state,    setState]    = useState<AccessState>('loading');
  const [token,    setToken]    = useState('');
  const [userName, setUserName] = useState('');
  const [errMsg,   setErrMsg]   = useState('');

  useEffect(() => {
    if (!canvasId) return;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      // Not logged in
      if (!user) {
        router.replace(`/login?redirect=/canvas/${canvasId}${urlRole ? '?role=' + urlRole : ''}`);
        return;
      }

      try {
        // Force refresh token to make sure it's fresh
        const firebaseToken = await user.getIdToken(true);

        // Verify access with backend
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas/${canvasId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${firebaseToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (res.status === 401) {
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

        // Access confirmed
        setToken(firebaseToken);
        setUserName(user.displayName || user.email?.split('@')[0] || 'User');
        setState('ready');
      } catch (err) {
        console.error('Canvas access check failed:', err);
        setState('denied');
        setErrMsg('Network error. Check your connection and try again.');
      }
    });

    return () => unsubscribe();
  }, [canvasId, urlRole, router]);

  // Loading
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

  // Access denied
  if (state === 'denied') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full mx-4 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9v4m0 4h.01M5.07 19H19a2 2 0 001.75-2.96l-6.97-12a2 2 0 00-3.5 0l-6.97 12A2 2 0 005.07 19z"
                stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              />
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
              onClick={() => router.push('/dashboard')}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Ready — render whiteboard
  const wbProps: InfiniteWhiteboardProps = {
    canvasId,
    firebaseToken: token,
    userName,
    userRole: urlRole,
  };
  return <InfiniteWhiteboard {...wbProps} />;
}

// Wrap in Suspense because useSearchParams() requires it in Next.js 13+
export default function CanvasPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-9 h-9 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    }>
      <CanvasPageInner />
    </Suspense>
  );
}