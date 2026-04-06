'use client';

// FILE: app/canvas/join/page.tsx
// This is the index page for /canvas/join — there is no token at this level.
// All share-link traffic goes to /canvas/join/[token]/page.tsx.
// Redirect anyone who lands here without a token to the dashboard.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="w-9 h-9 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
    </div>
  );
}