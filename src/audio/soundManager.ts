/**
 * Sound Manager - File-based audio + Web Audio API oscillator for button clicks.
 * Sounds only play AFTER preloadSounds() is called (requires user gesture on mobile).
 *
 * AUDIO FILES (place in /public/audio/):
 *   - tick.mp3, heartbeat.mp3, round-start.mp3, stop-buzzer.mp3
 *   - results-reveal.mp3, player-join.mp3, fah.mp3, winner.mp3
 */

const STORAGE_KEY = 'naija_sound_muted';

export type SoundName =
  | 'tick'
  | 'heartbeat'
  | 'roundStart'
  | 'stop'
  | 'resultsReveal'
  | 'playerJoin'
  | 'lastPlace'
  | 'winner';

const SOUND_FILES: Record<SoundName, string> = {
  tick: '/audio/tick.mp3',
  heartbeat: '/audio/heartbeat.mp3',
  roundStart: '/audio/round-start.mp3',
  stop: '/audio/stop-buzzer.mp3',
  resultsReveal: '/audio/results-reveal.mp3',
  playerJoin: '/audio/player-join.mp3',
  lastPlace: '/audio/fah.mp3',
  winner: '/audio/winner.mp3',
};

const audioCache: Map<SoundName, HTMLAudioElement> = new Map();

let muted = false;
let initialized = false;
let audioCtx: AudioContext | null = null;

try {
  muted = localStorage.getItem(STORAGE_KEY) === 'true';
} catch {}

function getContext(): AudioContext | null {
  if (!initialized) return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

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
 * Play a file-based sound. No-op if muted or not initialized.
 */
export function playSound(name: SoundName): void {
  if (muted || !initialized) return;

  try {
    const audio = getAudio(name);
    if (!audio) return;

    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = getVolume(name);
    clone.play().catch(() => {});
  } catch {
    // Non-critical — ignore
  }
}

/**
 * Play a synthesized button click using Web Audio API oscillator.
 * No file needed — generates a 6ms sine burst at 1000Hz.
 * Safe on iPhone since it uses the same AudioContext initialized on first tap.
 */
export function playClick(): void {
  if (muted || !initialized) return;

  try {
    const ctx = getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 1000;

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.006);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.006);
  } catch {
    // Non-critical — ignore
  }
}

function getVolume(name: SoundName): number {
  switch (name) {
    case 'tick':
      return 0.5;
    case 'heartbeat':
      return 0.4;
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
 * Play tick sound for the round timer. Only ticks when ≤15 seconds remain.
 * Adds heartbeat in the last 5 seconds.
 */
export function playTimerTick(secondsLeft: number): void {
  if (muted || !initialized) return;
  if (secondsLeft > 15 || secondsLeft <= 0) return;

  playSound('tick');

  if (secondsLeft <= 5) {
    playSound('heartbeat');
  }
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  try {
    localStorage.setItem(STORAGE_KEY, String(muted));
  } catch {}
  return muted;
}

export function setMuted(val: boolean): void {
  muted = val;
  try {
    localStorage.setItem(STORAGE_KEY, String(muted));
  } catch {}
}

/**
 * Initialize sound system. Must be called from a user gesture.
 */
export function preloadSounds(): void {
  initialized = true;
  const priority: SoundName[] = ['tick', 'roundStart', 'stop'];
  priority.forEach(getAudio);
}
