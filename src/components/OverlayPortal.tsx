import { createPortal } from 'react-dom';
import { useEffect, useState, type ReactNode } from 'react';

/** Render an app overlay above the shell content while keeping it inside the shell. */
export function OverlayPortal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById('app-overlay-root'));
  }, []);

  return target ? createPortal(children, target) : null;
}
