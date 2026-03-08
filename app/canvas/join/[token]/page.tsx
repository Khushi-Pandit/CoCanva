'use client';

// FILE: app/canvas/join/[token]/page.tsx
//
// This page is the landing point for ALL share links.
// Flow:
//   1. User opens  /canvas/join/<token>
//   2. We verify Firebase auth (redirect to login if needed)
//   3. Call GET /api/v1/canvas/join/:token  → { canvasId, role, title }
//   4. Store share token in sessionStorage so [canvasId]/page.tsx can read it
//   5. Redirect to /canvas/<canvasId>  ← same URL for everyone, role comes from token

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { auth } from '../../../../lib/firebase';

type JoinState = 'loading' | 'error';

function JoinPageInner() {
  const params  = useParams();
  const router  = useRouter();
  const token   = params.token as string;

  const [state,  setState]  = useState<JoinState>('loading');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!token) { setErrMsg('Invalid link.'); setState('error'); return; }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      // Not logged in → go to login, come back after
      if (!user) {
        router.replace(`/login?redirect=/canvas/join/${token}`);
        return;
      }

      try {
        const firebaseToken = await user.getIdToken(true);

        // Resolve the share token → { canvasId, role, title }
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas/join/${token}`,
          { headers: { Authorization: `Bearer ${firebaseToken}` } }
        );

        if (res.status === 404) {
          setErrMsg('This invite link is invalid or has expired.');
          setState('error');
          return;
        }
        if (!res.ok) {
          setErrMsg('Something went wrong. Please try again.');
          setState('error');
          return;
        }

        const data: { canvasId: string; role: string; title: string } = await res.json();

        // Store the raw share token in sessionStorage.
        // [canvasId]/page.tsx reads this and sends it as x-share-token header
        // so the backend can resolve the correct role for this user.
        sessionStorage.setItem(`share_token_${data.canvasId}`, token);

        // Everyone lands on the SAME url — role is resolved server-side via the token
        router.replace(`/canvas/${data.canvasId}`);
      } catch {
        setErrMsg('Network error. Check your connection and try again.');
        setState('error');
      }
    });

    return () => unsubscribe();
  }, [token, router]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-slate-500">Joining canvas…</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
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
        <h2 className="text-base font-semibold text-slate-800 mb-2">Invalid Invite Link</h2>
        <p className="text-sm text-slate-500 mb-6">{errMsg}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-9 h-9 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    }>
      <JoinPageInner />
    </Suspense>
  );
}