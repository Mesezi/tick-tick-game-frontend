import { useState, useEffect } from 'react';

const KEY_DISMISSED = 'tt_install_dismissed_at';
const KEY_CANCELLED = 'tt_install_cancelled_at';

const COOLDOWN_DISMISSED = 7 * 24 * 60 * 60 * 1000; // 7 days  — closed banner, not interested
const COOLDOWN_CANCELLED = 2 * 24 * 60 * 60 * 1000; // 2 days  — opened dialog, then backed out

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isInCooldown(): boolean {
  const dismissed = localStorage.getItem(KEY_DISMISSED);
  const cancelled = localStorage.getItem(KEY_CANCELLED);

  if (dismissed && Date.now() - Number(dismissed) < COOLDOWN_DISMISSED) return true;
  if (cancelled && Date.now() - Number(cancelled) < COOLDOWN_CANCELLED) return true;
  return false;
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Already running as installed PWA — never show
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // In cooldown from a previous dismiss/cancel
    if (isInCooldown()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;

    if (outcome === 'accepted') {
      // Clear any cooldowns — they installed it.
      // Next time they open in browser (if uninstalled), display-mode
      // will be 'browser' again and beforeinstallprompt will fire naturally.
      localStorage.removeItem(KEY_DISMISSED);
      localStorage.removeItem(KEY_CANCELLED);
    } else {
      // Opened the dialog but backed out — try again in 2 days
      localStorage.setItem(KEY_CANCELLED, Date.now().toString());
    }

    setShowBanner(false);
    setPromptEvent(null);
  };

  const handleDismiss = () => {
    // Closed the banner without engaging — try again in 7 days
    localStorage.setItem(KEY_DISMISSED, Date.now().toString());
    setShowBanner(false);
  };

  return { showBanner, handleInstall, handleDismiss };
}
