'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';

interface LogoutButtonProps {
  className?: string;
  children?: React.ReactNode;
  /** Affiche une modale de confirmation avant de déconnecter */
  confirm?: boolean;
}

export function LogoutButton({ className, children, confirm = false }: LogoutButtonProps) {
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const doLogout = async () => {
    setLoading(true);
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    router.push('/activation');
  };

  const handleClick = () => {
    if (confirm) setOpen(true);
    else doLogout();
  };

  return (
    <>
      <button onClick={handleClick} className={className} title="Se déconnecter">
        {children ?? '🚪'}
      </button>

      {/* ── Modale de confirmation ── */}
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
            {/* Icône */}
            <div className="flex flex-col items-center pt-8 pb-4 px-6">
              <div className="w-16 h-16 rounded-full bg-[#fff0f0] flex items-center justify-center text-4xl mb-4">
                🚪
              </div>
              <h2 className="text-[17px] font-black text-[#1F1B2E] text-center">
                Déconnexion
              </h2>
              {user && (
                <p className="text-sm text-[#6b6b78] text-center mt-1">
                  {user.prenoms} {user.nom}
                </p>
              )}
              <p className="text-sm text-[#6b6b78] text-center mt-3 leading-relaxed">
                Es-tu sûr(e) de vouloir te déconnecter ?
              </p>
            </div>

            {/* Boutons */}
            <div className="flex gap-3 px-6 pb-8">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 py-3 rounded-xl border-2 border-[#ececf0] text-sm font-bold text-[#6b6b78] hover:bg-[#f7f7fa] transition active:scale-[0.98]"
              >
                Annuler
              </button>
              <button
                onClick={doLogout}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-[#C62828] text-white text-sm font-bold hover:bg-[#a82020] transition active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? '…' : 'Déconnecter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
