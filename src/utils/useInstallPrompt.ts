import { useState, useEffect } from 'react';

const KEY_DISMISSED = 'tt_install_dismissed_at';
const KEY_CANCELLED = 'tt_install_cancelled_at';

const COOLDOWN_DISMISSED = 7 * 24 * 60 * 60 * 1000; // 7 days
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

/** True when running in iOS Safari (not Chrome/Firefox on iOS, not standalone) */
function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  // iOS Safari doesn't have 'CriOS' (Chrome) or 'FxiOS' (Firefox)
  const isSafari = /safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return isIos && isSafari;
}

export type InstallMode = 'android' | 'ios' | null;

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installMode, setInstallMode] = useState<InstallMode>(null);

  useEffect(() => {
    // Already installed — never show
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (isInCooldown()) return;

    if (isIosSafari()) {
      // iOS Safari: no event, just show the manual instructions banner
      setInstallMode('ios');
      setShowBanner(true);
      return;
    }

    // Android Chrome / other browsers: wait for beforeinstallprompt
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
      // Nothing to trigger — user follows the manual steps shown in the banner
      // Treat as "engaged" — dismiss with short cooldown
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

  const handleDismiss = () => {
    localStorage.setItem(KEY_DISMISSED, Date.now().toString());
    setShowBanner(false);
  };

  return { showBanner, installMode, handleInstall, handleDismiss };
}
