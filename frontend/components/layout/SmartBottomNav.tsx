'use client';
import { useAuthHydrated, useAuthStore } from '@/store/auth';
import { BottomNav } from './BottomNav';
import { isManagementRole } from '@/lib/roles';

export function SmartBottomNav() {
  const hydrated = useAuthHydrated();
  const { user: storedUser } = useAuthStore();
  const user = hydrated ? storedUser : null;
  if (!user) return <BottomNav variant="guest" />;
  if (isManagementRole(user.role)) return <BottomNav variant="guide" />;
  return <BottomNav variant="gardien" />;
}
