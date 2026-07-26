interface ConnectionLostOverlayProps {
  onRetry: () => void;
}

/**
 * Dark full-screen overlay with green retry button.
 */
export function ConnectionLostOverlay({ onRetry }: ConnectionLostOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-[#0a1a0f]/95 backdrop-blur-sm p-6"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="text-5xl" aria-hidden="true">
          📡
        </div>
        <h1 className="text-2xl font-bold text-white">
          Connection Lost
        </h1>
        <p className="text-[#8aaa8a]">
          We couldn't reconnect to the game server. Check your internet
          connection and try again.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="w-full px-6 py-3 bg-[#00ff88] text-[#0a1a0f] font-bold rounded-xl
            hover:bg-[#00dd77] focus:outline-none focus:ring-2 focus:ring-[#00ff88]/30 focus:ring-offset-2 focus:ring-offset-[#0a1a0f]
            active:scale-95 transition-all text-lg"
        >
          Retry Connection
        </button>
        <p className="text-xs text-[#5a7a5a]">
          If the problem persists, try refreshing the page.
        </p>
      </div>
    </div>
  );
}
