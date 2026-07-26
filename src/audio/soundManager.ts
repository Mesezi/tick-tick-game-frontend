/**
 * Sound Manager - File-based audio playback using HTML Audio elements.
 * Sounds are only created/played AFTER preloadSounds() is called (user gesture required).
 *
 * AUDIO FILES (place in /public/audio/):
 *   - tick-soft.mp3, tick-medium.mp3, tick-urgent.mp3
 *   - heartbeat.mp3, round-start.mp3, stop-buzzer.mp3
 *   - results-reveal.mp3, player-join.mp3, button-click.mp3
 *   - fah.mp3, winner.mp3
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

// Audio elements created lazily
const audioCache: Map<SoundName, HTMLAudioElement> = new Map();

let muted = false;
let initialized = false; // Only true after preloadSounds() is called

// Initialize mute state from localStorage
try {
  muted = localStorage.getItem(STORAGE_KEY) === 'true';
} catch {
  // localStorage unavailable
}

/**
 * Get or create an Audio element for a given sound.
 * Returns null if not yet initialized.
 */
function getAudio(name: SoundName): HTMLAudioElement | null {
  if (!initialized) return null;

  let audio = audioCache.get(name);
  if (!audio) {
    audio = new Audio(SOUND_FILES[name]);
    audio.preload = 'auto';
    audioCache.set(name, audio);
  }
  return audio;
}

/**
 * Play a sound by name. No-op if muted or not initialized.
 */
export function playSound(name: SoundName): void {
  if (muted || !initialized) return;

  try {
    const audio = getAudio(name);
    if (!audio) return;

    // Clone the audio node for overlapping playback
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = getVolume(name);
    clone.play().catch(() => {
      // Autoplay blocked — silently ignore
    });
  } catch {
    // Ignore errors — sound is non-critical
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
 */
export function playTimerTick(secondsLeft: number): void {
  if (muted || !initialized) return;
  if (secondsLeft > 30) return;

  if (secondsLeft <= 5) {
    playSound('tickUrgent');
    if (secondsLeft % 2 === 0) {
      playSound('heartbeat');
    }
  } else if (secondsLeft <= 10) {
    playSound('tickMedium');
  } else if (secondsLeft <= 30) {
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
 * Initialize the sound system. MUST be called from a user gesture (tap/click).
 * After this, all playSound calls will work.
 */
export function preloadSounds(): void {
  initialized = true;
  // Pre-create audio elements for commonly used sounds
  const priority: SoundName[] = ['buttonClick', 'roundStart', 'stop', 'tickUrgent'];
  priority.forEach(getAudio);
}
