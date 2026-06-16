'use client';
import { useToastStore } from '@/store/toast';

const ICONS: Record<string, string> = { success: '✓', error: '✕', info: 'ℹ' };
const STYLES: Record<string, string> = {
  success: 'bg-[#1b4332] border-[#2E7D32]/60 text-white',
  error:   'bg-[#7f1d1d] border-[#C62828]/60 text-white',
  info:    'bg-[#1e1b4b] border-[#3730a3]/60 text-white',
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl text-sm font-medium pointer-events-auto max-w-sm w-max animate-in fade-in slide-in-from-bottom-2 duration-200 ${STYLES[t.type]}`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs flex-shrink-0">
            {ICONS[t.type]}
          </span>
          <span>{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="ml-2 opacity-60 hover:opacity-100 transition-opacity text-xs"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
