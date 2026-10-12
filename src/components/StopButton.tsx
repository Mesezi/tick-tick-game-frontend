import type { StopButtonProps } from '../types';

/**
 * Full-width STOP button — school red, chalk-style.
 * Disabled when not all answers are filled or round is locked.
 */
export function StopButton({ disabled, onStop }: StopButtonProps) {
  return (
    <button
      type="button"
      onClick={onStop}
      disabled={disabled}
      aria-label="Stop the round"
      className="w-full min-h-14 px-8 py-4 rounded-2xl font-bold uppercase tracking-widest transition-all duration-150 select-none active:scale-95 font-display text-[28px] text-chalk-white"
      style={{
        background: disabled ? '#4a3520' : '#c0392b',
        boxShadow: disabled
          ? 'none'
          : '0 6px 20px rgba(192,57,43,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      STOP! ✋
    </button>
  );
}
