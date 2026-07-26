/**
 * Green circle with large white letter during reveal phase.
 */

interface LetterRevealProps {
  letter: string;
}

export function LetterReveal({ letter }: LetterRevealProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full px-4">
      <p className="text-base text-[#8aaa8a] font-medium mb-6 uppercase tracking-wide">
        This round's letter
      </p>

      <div
        aria-live="assertive"
        aria-atomic="true"
        className="animate-letter-reveal w-40 h-40 rounded-full bg-[#00ff88] flex items-center justify-center shadow-[0_0_40px_rgba(0,255,136,0.4)]"
      >
        <span className="text-8xl font-bold text-[#0a1a0f] font-heading">
          {letter.toUpperCase()}
        </span>
      </div>

      <p className="text-sm text-[#5a7a5a] mt-8 animate-pulse">
        Get ready to write...
      </p>

      <style>{`
        @keyframes letter-reveal {
          0% {
            opacity: 0;
            transform: scale(0.3) rotate(-5deg);
          }
          60% {
            opacity: 1;
            transform: scale(1.05) rotate(1deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
        .animate-letter-reveal {
          animation: letter-reveal 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
