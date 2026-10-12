import type { ConnectivityIndicatorProps } from '../types';

/**
 * ConnectivityIndicator — classroom-palette connection status dot.
 * Wood brown for connected, amber for degraded, red for disconnected.
 */
export function ConnectivityIndicator({ status, latencyMs }: ConnectivityIndicatorProps) {
  const textColorClass =
    status === 'connected'
      ? 'status-connected'
      : status === 'degraded'
      ? 'status-degraded'
      : 'status-offline';

  const dotClass =
    status === 'connected'
      ? 'bg-status-connected'
      : status === 'degraded'
      ? 'bg-status-degraded'
      : 'bg-status-offline';

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
        className={`h-2.5 w-2.5 rounded-full ${dotClass} ${status !== 'disconnected' ? 'animate-pulse' : ''}`}
        aria-hidden="true"
      />
      {status === 'connected' && (
        <span className={`text-sm font-bold uppercase tracking-wide font-hand ${textColorClass}`}>
          Connected
        </span>
      )}
      {status === 'degraded' && latencyMs != null && (
        <span className={`text-sm font-medium tabular-nums font-hand ${textColorClass}`}>
          {latencyMs}ms
        </span>
      )}
      {status === 'disconnected' && (
        <span className={`text-sm font-medium font-hand ${textColorClass}`}>
          Offline
        </span>
      )}
    </div>
  );
}
