import { motion, useReducedMotion } from 'motion/react';
import { Gamepad2, Trophy, UserRound, Users } from 'lucide-react';

export type DockTab = 'play' | 'friends' | 'notifications' | 'board' | 'profile';

interface BottomDockProps {
  active: DockTab;
  inMatch: boolean;
  friendRequests: number;
  protectedAccess: boolean;
  onSelect: (tab: DockTab) => void;
}

const ITEMS: { id: DockTab; label: string; Icon: typeof Gamepad2 }[] = [
  { id: 'play', label: 'Play', Icon: Gamepad2 },
  { id: 'friends', label: 'Friends', Icon: Users },
  { id: 'board', label: 'Board', Icon: Trophy },
  { id: 'profile', label: 'Profile', Icon: UserRound },
] as const;

export function BottomDock({ active, inMatch, friendRequests, protectedAccess, onSelect }: BottomDockProps) {
  const reduceMotion = useReducedMotion();
  return <nav aria-label="Main navigation" className="z-40 shrink-0 border-t border-[#d4c9b0] bg-[rgba(245,240,232,0.94)] px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl" style={{ boxShadow: '0 -6px 20px rgba(74,48,23,0.08)' }}>
    <div className="mx-auto flex max-w-md items-center justify-around">
      {ITEMS.map(({ id, label, Icon }) => {
        const selected = active === id;
        const locked = !protectedAccess && (id === 'friends' || id === 'profile');
        return <motion.button key={id} disabled={locked} whileTap={locked || reduceMotion ? undefined : { scale: 0.94 }} onClick={() => onSelect(id)} aria-current={selected ? 'page' : undefined} aria-disabled={locked || undefined} aria-label={locked ? `${label}. Complete student registration to unlock` : id === 'play' && inMatch ? 'Return to game' : label} title={locked ? 'Complete student registration to unlock' : undefined} className={`relative flex min-h-14 min-w-[64px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 transition-colors ${selected ? 'text-[#6b4423]' : 'text-[#8b765f]'} ${locked ? 'cursor-not-allowed opacity-45' : ''}`}>
          <span className="relative"><Icon className="h-[19px] w-[19px]" strokeWidth={selected ? 2.5 : 2} />{id === 'friends' && friendRequests > 0 && <span className="absolute -right-2 -top-2 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#c93226] px-1 text-[10px] font-bold leading-none text-white">{friendRequests > 9 ? '9+' : friendRequests}</span>}</span>
          <span className={`text-xs leading-none ${selected ? 'font-bold' : 'font-medium'}`}>{label}</span>
          {selected && <motion.span layoutId="dock-indicator" className="absolute inset-0 -z-10 rounded-xl bg-[rgba(139,94,60,0.1)]" transition={reduceMotion ? { duration: 0.01 } : { type: 'spring', bounce: 0, duration: 0.28 }} />}
        </motion.button>;
      })}
    </div>
  </nav>;
}
