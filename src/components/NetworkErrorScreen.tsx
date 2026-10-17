import { RefreshCw } from 'lucide-react';

export function NetworkErrorScreen() {
  return (
    <div
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center p-8 text-center"
      style={{ background: '#4a3520', color: '#f0ede4' }}
      role="alert"
      aria-live="assertive"
    >
      <div style={{ display: 'flex', width: '100%', maxWidth: 320, flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <img
          src="/tick-tick-logo.png"
          alt="Tick Tick"
          style={{ display: 'block', width: 176, height: 'auto', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.25))' }}
        />
        <div>
          <h1 style={{ margin: '0 0 8px', color: '#f0ede4', fontFamily: '"Dela Gothic One", sans-serif', fontSize: 26 }}>
            Game server unavailable
          </h1>
          <p style={{ margin: 0, color: '#f5f0e8', fontFamily: '"Patrick Hand", sans-serif', fontSize: 20 }}>
            Check your internet connection and reload to play Tick Tick.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 0, borderRadius: 16, padding: '16px 24px', background: '#f5f0e8', color: '#4a3520', fontFamily: '"Patrick Hand", sans-serif', fontSize: 20, fontWeight: 700, cursor: 'pointer' }}
        >
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
          Reload game
        </button>
      </div>
    </div>
  );
}
