import { Volume2, VolumeX, Home } from 'lucide-react';

interface TopBarProps {
  soundMuted: boolean;
  showHome: boolean;
  connectionStatus: 'connected' | 'degraded' | 'disconnected';
  onToggleSound: () => void;
  onGoHome: () => void;
}

const STATUS_COLOR = {
  connected: '#00d060',
  degraded: '#ffb800',
  disconnected: '#ff3b5c',
};

const STATUS_LABEL = {
  connected: 'LIVE',
  degraded: 'SLOW',
  disconnected: 'OFFLINE',
};

export function TopBar({ soundMuted, showHome, connectionStatus, onToggleSound, onGoHome }: TopBarProps) {
  const color = STATUS_COLOR[connectionStatus];

  return (
    <div className="flex items-center justify-between px-4 py-3.5 pt-safe shrink-0 z-40">
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleSound}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all active:scale-90"
          style={{ background: '#0d2018' }}
          aria-label={soundMuted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {soundMuted
            ? <VolumeX className="w-5 h-5" style={{ color: '#6baf80' }} />
            : <Volume2 className="w-5 h-5" style={{ color: '#00d060' }} />}
        </button>

        {showHome && (
          <button
            onClick={onGoHome}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all active:scale-90"
            style={{ background: '#0d2018' }}
            aria-label="Go home"
          >
            <Home className="w-3.5 h-3.5" style={{ color: '#6baf80' }} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color, animation: 'ping-dot 2s ease-in-out infinite' }}
        />
        <span className="text-[9px] font-bold tracking-widest" style={{ color }}>
          {STATUS_LABEL[connectionStatus]}
        </span>
      </div>
    </div>
  );
}
