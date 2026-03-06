'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth } from '../../../lib/firebase';  // Step 3 wali file
import InfiniteWhiteboard from '../page';

export default function CanvasPage() {
  const params = useParams();
  const router = useRouter();
  const canvasId = params.canvasId as string;

  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState('Anonymous');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const firebaseToken = await user.getIdToken();
        setToken(firebaseToken);
        setUserName(user.displayName || user.email || 'Anonymous');
      } else {
        // User logged in nahi hai — login page pe bhejo
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <p className="text-gray-500">Loading canvas...</p>
      </div>
    );
  }

  if (!token) return null;

  return (
    <InfiniteWhiteboard
      canvasId={canvasId}
      firebaseToken={token}
      userName={userName}
    />
  );
}