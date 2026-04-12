'use client';
import { create } from 'zustand';
import { User } from 'firebase/auth';
import { UserProfile } from '@/types/user';
import { setTokenProvider } from '@/lib/api/client';

interface AuthState {
  firebaseUser: User | null;
  profile: UserProfile | null;
  token: string | null;
  loading: boolean;
  setFirebaseUser: (user: User | null) => void;
  setProfile: (p: UserProfile | null) => void;
  setToken: (t: string | null) => void;
  setLoading: (v: boolean) => void;
  getToken: () => Promise<string | null>;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  firebaseUser: null,
  profile: null,
  token: null,
  loading: true,

  setFirebaseUser: (user) => {
    set({ firebaseUser: user });
    // wire token provider
    if (user) {
      setTokenProvider(async () => {
        const t = await user.getIdToken();
        set({ token: t });
        return t;
      });
    } else {
      setTokenProvider(async () => null);
    }
  },
  setProfile: (profile) => set({ profile }),
  setToken: (token)   => set({ token }),
  setLoading: (loading) => set({ loading }),

  getToken: async () => {
    const { firebaseUser } = get();
    if (!firebaseUser) return null;
    try {
      const t = await firebaseUser.getIdToken();
      set({ token: t });
      return t;
    } catch {
      return null;
    }
  },

  clear: () => set({ firebaseUser: null, profile: null, token: null, loading: false }),
}));
