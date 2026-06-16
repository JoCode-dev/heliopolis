'use client';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { deferEffect } from '@/lib/effects';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isGuest: boolean;
  setUser: (user: User | null) => void;
  setTokens: (access: string, refresh: string) => void;
  setGuest: (v: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isGuest: false,
      setUser: (user) => {
        if (typeof document !== 'undefined') {
          if (user?.role) {
            document.cookie = `user_role=${user.role}; path=/; max-age=86400; SameSite=Lax`;
          } else {
            document.cookie = 'user_role=; path=/; max-age=0; SameSite=Lax';
          }
        }
        set({ user });
      },
      setTokens: (_accessToken, _refreshToken) => {
        // Les tokens JWT sont désormais gérés via cookies httpOnly (serveur)
        // On ne les stocke plus en localStorage (vulnérable XSS)
        set({ accessToken: null });
      },
      setGuest: (isGuest) => set({ isGuest }),
      logout: () => {
        if (typeof window !== 'undefined') {
          document.cookie = 'user_role=; path=/; max-age=0; SameSite=Lax';
        }
        set({ user: null, accessToken: null, isGuest: false });
      },
    }),
    {
      name: 'codex-auth',
      skipHydration: true,
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, isGuest: s.isGuest }),
    }
  )
);

let authRehydrationStarted = false;

function ensureAuthRehydrated() {
  if (useAuthStore.persist.hasHydrated() || authRehydrationStarted) return;
  authRehydrationStarted = true;
  void useAuthStore.persist.rehydrate();
}

export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persistApi = useAuthStore.persist;
    let mounted = true;
    const unsubscribe = persistApi.onFinishHydration(() => {
      if (mounted) setHydrated(true);
    });
    let deferredCleanup: (() => void) | undefined;

    if (persistApi.hasHydrated()) {
      deferredCleanup = deferEffect(() => {
        if (mounted) setHydrated(true);
      });
    } else {
      ensureAuthRehydrated();
    }

    return () => {
      mounted = false;
      deferredCleanup?.();
      unsubscribe();
    };
  }, []);

  return hydrated;
}
