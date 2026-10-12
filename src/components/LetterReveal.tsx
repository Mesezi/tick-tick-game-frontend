/**
 * LetterReveal — chalkboard-style letter announcement.
 * Wood-brown badge with chalk-white lettering.
 */
interface LetterRevealProps {
  letter: string;
}

export function LetterReveal({ letter }: LetterRevealProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full px-4">
      <p className="text-sm font-bold uppercase tracking-widest mb-6 label-section">
        This round's letter
      </p>

      <div
        aria-live="assertive"
        aria-atomic="true"
        className="animate-letter-reveal w-36 h-36 rounded-2xl flex items-center justify-center"
        style={{
          background: '#4a3520',
          border: '3px solid #6b4423',
          backgroundImage: `radial-gradient(ellipse at 40% 35%, rgba(107,68,35,0.6) 0%, transparent 65%)`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(107,68,35,0.3)',
        }}
      >
        <span
          className="chalk-text font-display leading-none"
          style={{
            fontSize: '80px',
            color: '#f0ede4',
            textShadow: '0 0 20px rgba(240,237,228,0.3), 2px 2px 0 rgba(0,0,0,0.4)',
          }}
        >
          {letter.toUpperCase()}
        </span>
      </div>

      <p className="text-sm mt-8 animate-pulse font-hand text-desk">
        Get ready to write...
      </p>

      <style>{`
        @keyframes letter-reveal {
          0%   { opacity: 0; transform: scale(0.3) rotate(-5deg); }
          60%  { opacity: 1; transform: scale(1.06) rotate(1deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        .animate-letter-reveal {
          animation: letter-reveal 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  );
}
