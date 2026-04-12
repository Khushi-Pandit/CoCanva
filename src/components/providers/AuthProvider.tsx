'use client';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth.store';
import { useCanvasStore } from '@/store/canvas.store';
import { userApi } from '@/lib/api/user.api';
import { setShareTokenProvider } from '@/lib/api/client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setFirebaseUser, setProfile, setLoading } = useAuthStore();

  // Wire the shareToken provider once — client.ts will auto-attach x-share-token on all API calls
  useEffect(() => {
    setShareTokenProvider(() => useCanvasStore.getState().shareToken);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const { user: profile } = await userApi.me();
          setProfile(profile);
        } catch {
          // Profile fetch can fail on first login; backend auto-creates user on socket auth
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [setFirebaseUser, setProfile, setLoading]);

  return <>{children}</>;
}
