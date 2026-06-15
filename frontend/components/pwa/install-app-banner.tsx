'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'codex-pwa-install-dismissed';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isIosSafari() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

export function InstallAppBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return;
    if (!isMobileDevice()) return;

    if (isIosSafari()) {
      setShowIosHint(true);
      setVisible(true);
      return;
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[120] lg:bottom-4 lg:left-auto lg:right-4 lg:max-w-sm">
      <div className="rounded-2xl border border-[#ececf0] bg-white p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="text-2xl">📲</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#1F1B2E]">Installer le Codex</p>
            {showIosHint ? (
              <p className="mt-1 text-xs text-[#6b6b78] leading-relaxed">
                Sur iPhone : touchez <strong>Partager</strong>, puis{' '}
                <strong>Sur l&apos;écran d&apos;accueil</strong> pour installer l&apos;app.
              </p>
            ) : (
              <p className="mt-1 text-xs text-[#6b6b78] leading-relaxed">
                Ajoutez le Codex des Gardiens sur votre écran d&apos;accueil pour un accès rapide.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-[#6b6b78] hover:text-[#1F1B2E] text-sm"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          {!showIosHint && deferredPrompt && (
            <button
              type="button"
              onClick={install}
              className="flex-1 rounded-xl bg-[#C62828] px-3 py-2 text-xs font-semibold text-white"
            >
              Installer
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 rounded-xl border border-[#ececf0] px-3 py-2 text-xs font-semibold text-[#6b6b78]"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
