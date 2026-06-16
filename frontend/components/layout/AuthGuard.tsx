'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth';
import { getHomeForRole } from '@/lib/roles';
import { authApi } from '@/lib/api';
import type { UserRole } from '@/types';

interface AuthGuardProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function AuthGuard({ children, roles }: AuthGuardProps) {
  const router = useRouter();
  const { user, setUser, logout } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const rolesKey = useMemo(() => roles?.join('|') ?? '', [roles]);

  useEffect(() => {
    let cancelled = false;

    async function refreshUser() {
      try {
        // Le cookie access_token (httpOnly) est envoyé automatiquement
        const { data } = await authApi.me();
        if (!cancelled) setUser(data);
      } catch {
        logout();
        if (!cancelled) router.replace('/activation');
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    refreshUser();
    return () => {
      cancelled = true;
    };
  }, [logout, router, setUser]);

  useEffect(() => {
    if (checking) return;
    if (!user) {
      router.replace('/activation');
      return;
    }
    if (rolesKey && !rolesKey.split('|').includes(user.role)) {
      router.replace(getHomeForRole(user.role));
    }
  }, [checking, user, router, rolesKey]);

  if (checking || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Image src="/logo.jpeg" alt="Logo" width={64} height={64} className="object-contain mx-auto mb-3" loading="eager" preload />
        <p className="text-sm text-[#6b6b78]">Vérification…</p>
      </div>
    </div>
  );

  if (rolesKey && !rolesKey.split('|').includes(user.role)) return null;

  return <>{children}</>;
}
