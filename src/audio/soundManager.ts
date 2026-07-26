/**
 * Sound Manager - File-based audio playback using HTML Audio elements.
 * Preloads audio files from /audio/ directory.
 * Supports mute toggle persisted to localStorage.
 *
 * AUDIO FILES TO DOWNLOAD:
 * Place these in /public/audio/:
 *   - tick-soft.mp3       (soft clock tick, ~0.1s)
 *   - tick-medium.mp3     (slightly louder/faster tick, ~0.1s)
 *   - tick-urgent.mp3     (fast urgent tick, ~0.08s)
 *   - heartbeat.mp3       (subtle heartbeat pulse, ~0.4s)
 *   - round-start.mp3     (energetic short whoosh, ~0.5s)
 *   - stop-buzzer.mp3     (air horn / buzzer burst, ~0.4s)
 *   - grace-tick.mp3      (ticking clock for grace period, ~0.1s)
 *   - results-reveal.mp3  (swoosh + sparkle reveal, ~0.5s)
 *   - player-join.mp3     (friendly pop/notification, ~0.3s)
 *   - button-click.mp3    (subtle click, ~0.05s)
 */

const STORAGE_KEY = 'naija_sound_muted';

export type SoundName =
  | 'tickSoft'
  | 'tickMedium'
  | 'tickUrgent'
  | 'heartbeat'
  | 'roundStart'
  | 'stop'
  | 'resultsReveal'
  | 'playerJoin'
  | 'buttonClick'
  | 'lastPlace'
  | 'winner';

const SOUND_FILES: Record<SoundName, string> = {
  tickSoft: '/audio/tick-soft.mp3',
  tickMedium: '/audio/tick-medium.mp3',
  tickUrgent: '/audio/tick-urgent.mp3',
  heartbeat: '/audio/heartbeat.mp3',
  roundStart: '/audio/round-start.mp3',
  stop: '/audio/stop-buzzer.mp3',
  resultsReveal: '/audio/results-reveal.mp3',
  playerJoin: '/audio/player-join.mp3',
  buttonClick: '/audio/button-click.mp3',
  lastPlace: '/audio/fah.mp3',
  winner: '/audio/winner.mp3',
};

// Pool of Audio elements per sound (allows overlapping playback)
const audioPools: Map<SoundName, HTMLAudioElement[]> = new Map();
const POOL_SIZE = 3;

let muted = false;

// Initialize mute state from localStorage
try {
  muted = localStorage.getItem(STORAGE_KEY) === 'true';
} catch {
  // localStorage unavailable
}

/**
 * Get or create an available Audio element from the pool
 */
function getAudioFromPool(name: SoundName): HTMLAudioElement | null {
  let pool = audioPools.get(name);

  if (!pool) {
    pool = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const audio = new Audio(SOUND_FILES[name]);
      audio.preload = 'auto';
      pool.push(audio);
    }
    audioPools.set(name, pool);
  }

  // Find one that's not currently playing
  for (const audio of pool) {
    if (audio.paused || audio.ended) {
      return audio;
    }
  }

  // All busy — reset the first one
  const audio = pool[0];
  audio.currentTime = 0;
  return audio;
}

/**
 * Play a sound by name. No-op if muted.
 */
export function playSound(name: SoundName): void {
  if (muted) return;

  try {
    const audio = getAudioFromPool(name);
    if (audio) {
      audio.currentTime = 0;
      audio.volume = getVolume(name);
      audio.play().catch(() => {
        // Autoplay blocked — ignore silently
      });
    }
  } catch (e) {
    console.warn('[SoundManager] Failed to play sound:', name, e);
  }
}

/**
 * Get volume level for each sound type
 */
function getVolume(name: SoundName): number {
  switch (name) {
    case 'buttonClick':
      return 0.3;
    case 'tickSoft':
      return 0.35;
    case 'tickMedium':
      return 0.5;
    case 'tickUrgent':
      return 0.6;
    case 'heartbeat':
      return 0.45;
    case 'playerJoin':
      return 0.5;
    case 'roundStart':
      return 0.7;
    case 'stop':
      return 0.75;
    case 'resultsReveal':
      return 0.6;
    case 'lastPlace':
      return 0.7;
    case 'winner':
      return 0.7;
    default:
      return 0.5;
  }
}

/**
 * Play the appropriate timer tick based on remaining seconds.
 * Call this every second from the game timer.
 */
export function playTimerTick(secondsLeft: number): void {
  if (muted) return;
  if (secondsLeft > 30) return; // No sound above 30s

  if (secondsLeft <= 5) {
    // Last 5s: urgent tick + heartbeat
    playSound('tickUrgent');
    if (secondsLeft % 2 === 0) {
      playSound('heartbeat');
    }
  } else if (secondsLeft <= 10) {
    // 10-5s: medium tick every second
    playSound('tickMedium');
  } else if (secondsLeft <= 30) {
    // 30-10s: soft tick every 2 seconds
    if (secondsLeft % 2 === 0) {
      playSound('tickSoft');
    }
  }
}

/**
 * Check if sound is muted
 */
export function isMuted(): boolean {
  return muted;
}

/**
 * Toggle mute state
 */
export function toggleMute(): boolean {
  muted = !muted;
  try {
    localStorage.setItem(STORAGE_KEY, String(muted));
  } catch {
    // localStorage unavailable
  }
  return muted;
}

/**
 * Set mute state explicitly
 */
export function setMuted(val: boolean): void {
  muted = val;
  try {
    localStorage.setItem(STORAGE_KEY, String(muted));
  } catch {
    // localStorage unavailable
  }
}

/**
 * Preload all sounds (call after first user interaction)
 */
export function preloadSounds(): void {
  const names = Object.keys(SOUND_FILES) as SoundName[];
  names.forEach((name) => {
    // Creating the pool triggers preload
    getAudioFromPool(name);
  });
}
