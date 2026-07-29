import { useState, useEffect } from 'react';

const KEY_DISMISSED = 'tt_install_dismissed_at';
const KEY_CANCELLED = 'tt_install_cancelled_at';

const COOLDOWN_DISMISSED = 30 * 24 * 60 * 60 * 1000; // 30 days — confirmed installed or not interested
const COOLDOWN_CANCELLED = 2 * 24 * 60 * 60 * 1000; // 2 days

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

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export type InstallMode = 'android' | 'ios' | null;

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installMode, setInstallMode] = useState<InstallMode>(null);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (isInCooldown()) return;

    if (isIos()) {
      setInstallMode('ios');
      setShowBanner(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setInstallMode('android');
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (installMode === 'ios') {
      // "Got it" without confirming — remind again in 2 days
      localStorage.setItem(KEY_CANCELLED, Date.now().toString());
      setShowBanner(false);
      return;
    }
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      localStorage.removeItem(KEY_DISMISSED);
      localStorage.removeItem(KEY_CANCELLED);
    } else {
      localStorage.setItem(KEY_CANCELLED, Date.now().toString());
    }
    setShowBanner(false);
    setPromptEvent(null);
  };

  const handleConfirmInstalled = () => {
    // User confirmed they installed it — don't show for 30 days
    localStorage.setItem(KEY_DISMISSED, Date.now().toString());
    localStorage.removeItem(KEY_CANCELLED);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    // Closed without engaging — remind in 7 days
    localStorage.setItem(KEY_DISMISSED, Date.now().toString());
    setShowBanner(false);
  };

  return { showBanner, installMode, handleInstall, handleConfirmInstalled, handleDismiss };
}
