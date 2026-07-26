import type { ConnectivityIndicatorProps } from '../types';

/**
 * Green dot + "CONNECTED" text for connected state.
 * Orange for degraded, gray for disconnected.
 */
export function ConnectivityIndicator({ status, latencyMs }: ConnectivityIndicatorProps) {
  const dotColor: Record<ConnectivityIndicatorProps['status'], string> = {
    connected: 'bg-[#00ff88]',
    degraded: 'bg-[#FF6B35]',
    disconnected: 'bg-[#5a7a5a]',
  };

  const ariaLabels: Record<ConnectivityIndicatorProps['status'], string> = {
    connected: 'Connection status: connected',
    degraded: latencyMs != null
      ? `Connection status: degraded, latency ${latencyMs}ms`
      : 'Connection status: degraded',
    disconnected: 'Connection status: disconnected',
  };

  return (
    <div
      className="inline-flex items-center gap-1.5"
      role="status"
      aria-label={ariaLabels[status]}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${dotColor[status]} ${
          status === 'disconnected' ? '' : 'animate-pulse'
        }`}
        aria-hidden="true"
      />
      {status === 'connected' && (
        <span className="text-xs text-[#00ff88] font-bold uppercase tracking-wide">Connected</span>
      )}
      {status === 'degraded' && latencyMs != null && (
        <span className="text-xs text-[#FF6B35] font-medium tabular-nums">
          {latencyMs}ms
        </span>
      )}
      {status === 'disconnected' && (
        <span className="text-xs text-[#5a7a5a] font-medium">Offline</span>
      )}
    </div>
  );
}
