import { Volume2, VolumeX, Home } from 'lucide-react';

interface TopBarProps {
  soundMuted: boolean;
  showHome: boolean;
  connectionStatus: 'connected' | 'degraded' | 'disconnected';
  isBooting: boolean;
  onToggleSound: () => void;
  onGoHome: () => void;
}

const STATUS_LABEL = {
  connected: 'LIVE',
  degraded: 'SLOW',
  disconnected: 'OFFLINE',
};

/**
 * TopBar — paper-tone chrome.
 * Light paper surface so it clearly separates from the chalkboard header below.
 * Home icon uses a solid brown chip that's readable on any background.
 */
export function TopBar({ soundMuted, showHome, connectionStatus, isBooting, onToggleSound, onGoHome }: TopBarProps) {
  // const statusClass =
  //   connectionStatus === 'connected'
  //     ? 'status-connected bg-status-connected'
  //     : connectionStatus === 'degraded'
  //     ? 'status-degraded bg-status-degraded'
  //     : 'status-offline bg-status-offline';

  const textClass =
    connectionStatus === 'connected'
      ? 'status-connected'
      : connectionStatus === 'degraded'
      ? 'status-degraded'
      : 'status-offline';

  const dotClass =
    connectionStatus === 'connected'
      ? 'bg-status-connected'
      : connectionStatus === 'degraded'
      ? 'bg-status-degraded'
      : 'bg-status-offline';

  return (
    <div
      className="flex items-center justify-between px-4 py-2 pt-safe md:pt-2 shrink-0 z-40"
      style={{
        background: '#f5f0e8',
        borderBottom: '1px solid #d4c9b0',
      }}
    >
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleSound}
          className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90"
          style={{
            background: 'rgba(107,68,35,0.1)',
            border: '1px solid rgba(107,68,35,0.2)',
          }}
          aria-label={soundMuted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {soundMuted
            ? <VolumeX className="w-4 h-4 text-desk" />
            : <Volume2 className="w-4 h-4 text-desk-dark" />}
        </button>

        {showHome && (
          <button
            onClick={onGoHome}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90"
            style={{
              background: '#6b4423',
              border: '1px solid rgba(107,68,35,0.4)',
              boxShadow: '0 1px 4px rgba(107,68,35,0.25)',
            }}
            aria-label="Go home"
          >
            <Home className="w-3.5 h-3.5 text-chalk-white" />
          </button>
        )}
      </div>

      {/* Connection status */}
      {!isBooting && (
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${dotClass}`}
            style={{ animation: 'ping-dot 2s ease-in-out infinite' }}
          />
          <span className={`text-sm font-bold tracking-widest font-hand ${textClass}`}>
            {STATUS_LABEL[connectionStatus]}
          </span>
        </div>
      )}
    </div>
  );
}
