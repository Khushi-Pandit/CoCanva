'use client';

// FILE: app/canvas/[canvasId]/page.tsx
//
// Changes:
// - Reads sessionStorage share token and sends as x-share-token header to REST API  ✓ (was already done)
// - Also passes raw shareToken down to InfiniteWhiteboard so it can send it in
//   the socket canvas:join event — backend verifies it against DB for role resolution.

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { auth } from '../../../lib/firebase';
import InfiniteWhiteboard, { InfiniteWhiteboardProps } from '../../canvas/page';

type AccessState = 'loading' | 'denied' | 'ready';
type Role = 'owner' | 'editor' | 'viewer' | 'voice';

function CanvasPageInner() {
  const params   = useParams();
  const router   = useRouter();
  const canvasId = params.canvasId as string;

  const [state,      setState]      = useState<AccessState>('loading');
  const [token,      setToken]      = useState('');
  const [userName,   setUserName]   = useState('');
  const [userRole,   setUserRole]   = useState<Role>('viewer');
  const [shareToken, setShareToken] = useState('');   // raw share token for socket
  const [errMsg,     setErrMsg]     = useState('');

  useEffect(() => {
    if (!canvasId) return;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.replace(`/login?redirect=/canvas/${canvasId}`);
        return;
      }

      try {
        const firebaseToken = await user.getIdToken(true);

        // Share token stored by join/[token]/page.tsx after resolving the invite link
        const storedShareToken = sessionStorage.getItem(`share_token_${canvasId}`) ?? '';

        const headers: Record<string, string> = {
          Authorization: `Bearer ${firebaseToken}`,
        };
        if (storedShareToken) {
          headers['x-share-token'] = storedShareToken;
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas/${canvasId}`,
          { headers }
        );

        if (res.status === 401) { router.replace('/login'); return; }
        if (res.status === 403) {
          setState('denied');
          setErrMsg("You don't have access to this canvas. Ask the owner for an invite link.");
          return;
        }
        if (res.status === 404) {
          setState('denied');
          setErrMsg('Canvas not found.');
          return;
        }
        if (!res.ok) {
          setState('denied');
          setErrMsg('Something went wrong. Please try again.');
          return;
        }

        const data = await res.json();
        const resolvedRole: Role = data.userRole || 'viewer';

        setToken(firebaseToken);
        setUserName(user.displayName || user.email?.split('@')[0] || 'User');
        setUserRole(resolvedRole);
        setShareToken(storedShareToken);   // pass to socket join
        setState('ready');
      } catch {
        setState('denied');
        setErrMsg('Network error. Check your connection and try again.');
      }
    });

    return () => unsubscribe();
  }, [canvasId, router]);

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

  // ── Denied ─────────────────────────────────────────────────────────────────
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
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
            >
              Login
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Ready — render the whiteboard ──────────────────────────────────────────
  // NOTE: owner is kept as 'owner' role — InfiniteWhiteboard decides what
  // owner can/cannot do. We no longer force-cast owner → editor here.
  const wbProps: InfiniteWhiteboardProps = {
    canvasId,
    firebaseToken: token,
    userName,
    userRole,
    shareToken,    // socket join needs this to resolve role from DB
  };
  return <InfiniteWhiteboard {...wbProps} />;
}

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