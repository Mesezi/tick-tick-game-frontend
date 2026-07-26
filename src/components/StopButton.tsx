import type { StopButtonProps } from '../types';

/**
 * Full-width orange STOP button with white text.
 */
export function StopButton({ disabled, onStop }: StopButtonProps) {
  return (
    <button
      type="button"
      onClick={onStop}
      disabled={disabled}
      aria-label="Stop the round"
      className={`
        w-full min-h-14 px-8 py-4 rounded-xl text-xl font-bold uppercase tracking-widest
        transition-all duration-150 select-none font-heading
        ${
          disabled
            ? 'bg-[#2a4a32] text-[#5a7a5a] cursor-not-allowed opacity-60'
            : 'bg-[#FF6B35] text-white shadow-lg hover:bg-[#e55a2a] active:scale-95'
        }
      `}
    >
      STOP! ✋
    </button>
  );
}
