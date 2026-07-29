import { useEffect } from 'react';
import { preloadSounds, playClick } from '../audio/soundManager';

/**
 * Initialises the sound system on first user interaction (browser autoplay policy)
 * and plays a synthesised click on every button tap.
 */
export function useSoundInit() {
  useEffect(() => {
    let initialized = false;
    const handlePointer = (e: Event) => {
      if (!initialized) {
        preloadSounds();
        initialized = true;
      }
      if ((e.target as HTMLElement).closest('button')) {
        playClick();
      }
    };
    document.addEventListener('pointerdown', handlePointer);
    return () => document.removeEventListener('pointerdown', handlePointer);
  }, []);
}
