'use client';

// FILE: app/canvas/join/[token]/page.tsx

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '../../../lib/firebase';

type JoinState = 'loading' | 'error' | 'redirecting';

function JoinPageInner() {
  const params = useParams();
  const router = useRouter();
  const token  = params.token as string;

  const [state,  setState]  = useState<JoinState>('loading');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!token) return;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.replace(`/login?redirect=/canvas/join/${token}`);
        return;
      }

      try {
        const firebaseToken = await user.getIdToken(true);

        // Resolve token → { canvasId, role, title }
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/canvas/join/${token}`,
          { headers: { Authorization: `Bearer ${firebaseToken}` } }
        );

        if (res.status === 401) {
          router.replace(`/login?redirect=/canvas/join/${token}`);
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setState('error');
          setErrMsg(data.message || 'Invalid or expired link.');
          return;
        }

        const { canvasId, role } = await res.json();

        // Store share token in sessionStorage so canvasId page can send it to backend
        // This is how backend knows the role for this specific user via share link
        sessionStorage.setItem(`share_token_${canvasId}`, token);
        sessionStorage.setItem(`share_role_${canvasId}`, role);

        setState('redirecting');
        router.replace(`/canvas/${canvasId}`);
      } catch {
        setState('error');
        setErrMsg('Network error. Please try again.');
      }
    });

    return () => unsubscribe();
  }, [token, router]);

  if (state === 'loading' || state === 'redirecting') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-slate-500">
            {state === 'redirecting' ? 'Opening canvas…' : 'Verifying your link…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4m0 4h.01M5.07 19H19a2 2 0 001.75-2.96l-6.97-12a2 2 0 00-3.5 0l-6.97 12A2 2 0 005.07 19z"
              stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-base font-semibold text-slate-800 mb-2">Link Invalid</h2>
        <p className="text-sm text-slate-500 mb-6">{errMsg}</p>
        <button onClick={() => router.push('/dashboard')}
          className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors">
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