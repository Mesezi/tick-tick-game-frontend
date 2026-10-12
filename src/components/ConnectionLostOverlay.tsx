import { Radio } from 'lucide-react';

interface ConnectionLostOverlayProps {
  onRetry: () => void;
}

/**
 * ConnectionLostOverlay — chalkboard-themed full-screen error.
 * Shown when all reconnect attempts have failed.
 */
export function ConnectionLostOverlay({ onRetry }: ConnectionLostOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-100 flex flex-col items-center justify-center p-6"
      style={{
        background: 'rgba(20,42,28,0.96)',
        backdropFilter: 'blur(8px)',
      }}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="text-5xl" aria-hidden="true">
          <Radio className="w-12 h-12 mx-auto text-chalk-white opacity-70" />
        </div>
        <h1 className="font-display font-bold text-[28px] text-chalk-white">
          Connection Lost
        </h1>
        <p className="text-sm leading-relaxed font-hand text-chalk-white">
          We couldn't reconnect to the game server. Check your internet
          connection and try again.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="w-full px-6 py-4 rounded-2xl font-bold text-base active:scale-95 transition-all btn-primary font-hand"
          style={{ boxShadow: '0 4px 16px rgba(107,68,35,0.3)' }}
        >
          Retry Connection
        </button>
        <p className="text-sm font-hand text-chalk-mark">
          If the problem persists, try refreshing the page.
        </p>
      </div>
    </div>
  );
}
