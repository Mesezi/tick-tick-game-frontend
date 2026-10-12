import { Loader2 } from 'lucide-react';

/**
 * Translucent blocking overlay shown while waiting for the rejoin snapshot.
 */
export function RejoinLoadingOverlay() {
  return (
    <div
      className="absolute inset-0 z-100 flex flex-col items-center justify-center gap-3"
      style={{ background: 'rgba(20,42,28,0.48)', backdropFilter: 'blur(2px)' }}
      role="status"
      aria-live="polite"
      aria-label="Rejoining game"
    >
      <Loader2 className="h-10 w-10 animate-spin text-chalk-white" aria-hidden="true" />
      <p className="font-display text-xl text-chalk-white">Rejoining game...</p>
    </div>
  );
}
