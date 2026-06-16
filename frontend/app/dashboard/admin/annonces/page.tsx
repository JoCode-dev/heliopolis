'use client';
import { useEffect } from 'react';
import { AnnoncesManagePage } from '@/components/annonces/AnnoncesManagePage';
import { useUnreadCounts } from '@/store/unreadCounts';
import { useAuthStore } from '@/store/auth';

export default function AdminAnnoncesPage() {
  const markAnnoncesRead = useUnreadCounts(s => s.markAnnoncesRead);
  const user = useAuthStore(s => s.user);
  useEffect(() => { if (user?.id) markAnnoncesRead(user.id); }, [user?.id, markAnnoncesRead]);

  return <AnnoncesManagePage />;
}
