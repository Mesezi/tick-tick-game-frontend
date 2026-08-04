import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

/**
 * Initialise PostHog. Call once on app boot.
 * Set VITE_POSTHOG_KEY in .env.local to enable.
 * No-ops in development if key is not set.
 */
export function initAnalytics(): void {
  if (!POSTHOG_KEY) {
    console.info('[Analytics] PostHog key not set — tracking disabled');
    return;
  }
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage',
    autocapture: false,
  });
}

/**
 * Identify a user after they authenticate.
 * Call after session is established.
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return;
  posthog.identify(userId, properties);
}

/**
 * Track a named event with optional properties.
 * Usage: track('game_joined', { roomCode, playerCount })
 */
export function track(event: string, properties?: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return;
  posthog.capture(event, properties);
}

/**
 * Reset identity on logout / account deletion.
 */
export function resetAnalytics(): void {
  if (!POSTHOG_KEY) return;
  posthog.reset();
}
