import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { apiClient } from './api/client';
import { persistenceLayer } from './persistence/persistenceLayer';

/**
 * Rendered when URL path is /auth/callback.
 * Exchanges ?code= with POST /api/auth/google.
 * If a guest token exists, it's sent as Bearer — backend decides whether to link.
 */
export function GoogleCallbackApp() {
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error || !code) {
      setErrorMsg('Google sign in was cancelled or denied.');
      setStatus('error');
      return;
    }

    const exchange = async () => {
      try {
        // If we have a guest token, set it so the Authorization header is sent.
        // Backend sees the header → links Google to the existing guest account.
        // No header → creates/finds by Google ID.
        const existingToken = persistenceLayer.loadToken();
        if (existingToken) {
          apiClient.setToken(existingToken);
        }

        const res = await apiClient.googleLogin(code);

        // Save only the new token
        persistenceLayer.saveToken(res.token);

        // Redirect to root — App calls /auth/me on boot for full profile
        window.location.replace('/');
      } catch (err: unknown) {
        console.error('[GoogleCallback] Exchange failed:', err);
        const message = err instanceof Error && err.message.includes('409')
          ? 'This Google account is already linked to another player.'
          : 'Sign in failed. Please try again.';
        setErrorMsg(message);
        setStatus('error');
      }
    };

    exchange();
  }, []);

  return (
    <div
      className="h-screen w-full flex items-center justify-center"
      style={{ background: '#081510', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {status === 'loading' ? (
        <div className="flex flex-col items-center gap-4">
          <img
            src="/tick-tick logo.png"
            alt="Tick-Tick"
            className="w-20 opacity-90"
            style={{ filter: 'drop-shadow(0 4px 16px rgba(0,208,96,0.3))' }}
          />
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#00d060' }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
          <p className="text-xs" style={{ color: '#6baf80' }}>Signing you in...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 px-8 text-center">
          <span className="text-5xl">⚠️</span>
          <p className="text-white font-bold">{errorMsg}</p>
          <a
            href="/"
            className="px-6 py-3 rounded-2xl text-black font-bold text-sm"
            style={{ background: '#00d060' }}
          >
            Back to Home
          </a>
        </div>
      )}
    </div>
  );
}
