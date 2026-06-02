'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export function ShareButton({ campNom }: { campNom: string }) {
  const pathname  = usePathname();
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleShare = async () => {
    const url  = `${window.location.origin}${pathname}`;
    const text = `Rejoins-moi pour le camp « ${campNom } » !`;

    if (navigator.share) {
      try {
        await navigator.share({ title: campNom, text, url });
      } catch (e) {
        if ((e as DOMException).name !== 'AbortError') setState('error');
      }
      return;
    }

    /* Fallback : copie dans le presse-papier */
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
      setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2500);
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`w-full flex items-center justify-center gap-2 border text-sm font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] ${
        state === 'copied'
          ? 'bg-[#e1f4e3] border-[#a5d6a7] text-[#2E7D32]'
          : state === 'error'
          ? 'bg-[#fff0f0] border-[#ef9a9a] text-[#C62828]'
          : 'bg-white border-[#e6e6ea] text-[#1F1B2E] hover:bg-[#f7f7fb] hover:border-[#d0d0d8]'
      }`}
    >
      {state === 'copied' ? (
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Lien copié !
        </>
      ) : state === 'error' ? (
        <>⚠️ Impossible de partager</>
      ) : (
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Partager le camp
        </>
      )}
    </button>
  );
}
