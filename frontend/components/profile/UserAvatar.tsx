'use client';
import Image from 'next/image';
import { resolveMediaUrl } from '@/lib/media';

interface UserAvatarProps {
  avatarUrl?: string | null;
  initials: string;
  sizeClass?: string;
  textClass?: string;
  bgClass?: string;
}

export function UserAvatar({
  avatarUrl,
  initials,
  sizeClass = 'w-8 h-8',
  textClass = 'text-xs font-bold',
  bgClass = 'bg-white/20',
}: UserAvatarProps) {
  if (avatarUrl) {
    const src = resolveMediaUrl(avatarUrl);
    return (
      <Image
        src={src}
        width={64}
        height={64}
        alt="Avatar"
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} rounded-full ${bgClass} flex items-center justify-center ${textClass} flex-shrink-0`}
    >
      {initials}
    </div>
  );
}
