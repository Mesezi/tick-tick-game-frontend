import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, Check, ChevronDown, FlaskConical, Globe2, KeyRound, Music2, PawPrint, Pencil, PenLine, Timer, Trophy, Utensils, type LucideIcon, Users, Zap } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { AvatarDisplay } from '../components/AvatarDisplay';
import { socketHandler } from '../socket/socketHandler';
import { apiClient } from '../api/client';
import { useCategoryPacks } from '../api/queries';
import { showToast } from '../components/toastStore';
import { track } from '../utils/analytics';

interface CategoryPack {
  id: string;
  name: string;
  description: string;
  categories: string[];
  createdAt: string;
}

function categoryPackIcon(pack?: CategoryPack): LucideIcon {
  const text = `${pack?.name ?? ''} ${pack?.description ?? ''} ${pack?.categories.join(' ') ?? ''}`.toLowerCase();
  if (/nigeria|world|culture|country|geograph/.test(text)) return Globe2;
  if (/sport|football|game|athlet/.test(text)) return Trophy;
  if (/food|drink|meal|cook/.test(text)) return Utensils;
  if (/music|song|artist/.test(text)) return Music2;
  if (/science|school|education|study/.test(text)) return FlaskConical;
  if (/animal|pet|wildlife/.test(text)) return PawPrint;
  return BookOpen;
}

/**
 * LobbyScreen — classroom notice-board aesthetic.
 * Exercise-book panels, chalkboard headings, warm wood accents.
 */
export function LobbyScreen() {
  const session = useGameStore((s) => s.session);
  const onlineCount = useGameStore((s) => s.onlineCount);
  const [lobbyTab, setLobbyTab] = useState<'create' | 'join'>('create');
  const [selectedPackId, setSelectedPackId] = useState('');
  const [packMenuOpen, setPackMenuOpen] = useState(false);
  const [rounds, setRounds] = useState(3);
  const [roundDuration, setRoundDuration] = useState(90);
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isQuickMatching, setIsQuickMatching] = useState(false);

  const { data: packsData, isLoading: packsLoading } = useCategoryPacks();
  const packs: CategoryPack[] = packsData?.data.packs ?? [];
  const selectedPack = packs.find((pack) => pack.id === selectedPackId);
  const SelectedPackIcon = categoryPackIcon(selectedPack);
  const estimatedMinutes = Math.ceil((rounds * roundDuration) / 60);

  useEffect(() => {
    if (packs.length > 0 && !selectedPackId) {
      setSelectedPackId(packs[0].id);
    }
  }, [packs, selectedPackId]);

  const handleCreate = async () => {
    if (!selectedPackId || !session?.displayName) return;
    setIsLoading(true);
    try {
      const res = await apiClient.createRoom({
        categoryPackId: selectedPackId,
        roundDuration,
        totalRounds: rounds,
        displayName: session.displayName,
      });
      const roomCode = res.data.room.code;
      socketHandler.emit('join-room', { roomCode });
      setTimeout(() => {
        if (!useGameStore.getState().room) {
          setIsLoading(false);
          showToast('Connection timed out. Try again.', 'error');
        }
      }, 10000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create room';
      showToast(message, 'error');
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode || !session?.displayName) return;
    setIsLoading(true);
    try {
      await apiClient.joinRoom(joinCode, session.displayName);
      socketHandler.emit('join-room', { roomCode: joinCode });
      setTimeout(() => {
        if (!useGameStore.getState().room) {
          setIsLoading(false);
          showToast('Connection timed out. Try again.', 'error');
        }
      }, 10000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join room';
      showToast(message, 'error');
      setIsLoading(false);
    }
  };

  const handleAction = () => {
    showToast('Connecting...', 'info');
    if (lobbyTab === 'create') handleCreate();
    else handleJoin();
  };

  const handleQuickMatch = async () => {
    if (!session?.displayName) return;
    setIsQuickMatching(true);
    try {
      const res = await apiClient.quickMatch(session.displayName);
      const roomCode = res.data.room.code;
      socketHandler.emit('join-room', { roomCode });
      track('quick_match_started');
      setTimeout(() => {
        if (!useGameStore.getState().room) {
          setIsQuickMatching(false);
          showToast('Connection timed out. Try again.', 'error');
        }
      }, 10000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Quick match failed';
      showToast(message, 'error');
      setIsQuickMatching(false);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden paper-body"
      data-testid="screen-lobby"
    >
      {/* Chalkboard header bar — compact */}
      <div
        className="px-5 pt-4 pb-3 shrink-0"
        style={{ borderBottom: '2px solid rgba(107,68,35,0.6)' }}
      >
        <div className="flex items-center gap-2.5">
          <AvatarDisplay avatarId={session?.avatarId} className="h-8 w-8 shrink-0 object-contain text-2xl" />
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-[22px] leading-tight">
              Game Lobby
            </h2>
            <p className="text-sm truncate font-hand label-section" >
              {session?.displayName || 'Player'} · Ready to compete
            </p>
          </div>
          {onlineCount != null && onlineCount >= 3 && (
            <p className="shrink-0 flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-bold font-hand text-chalk-white" role="status">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {onlineCount} online
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-5 py-3 scrollbar-mobile-hidden">
        {/* Quick Match */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleQuickMatch}
          disabled={isQuickMatching || isLoading}
          className="w-full rounded-xl py-3 mb-3 hidden items-center justify-center gap-2 disabled:opacity-60 btn-primary font-display text-[17px]"
          style={{ boxShadow: '0 3px 14px rgba(107,68,35,0.28), inset 0 1px 0 rgba(255,255,255,0.1)' }}
        >
          <Zap className="w-4 h-4" />
          {isQuickMatching ? 'Finding match...' : 'Quick Match'}
        </motion.button>

        {/* Divider */}
        <div className="hidden items-center gap-2 mb-3">
          <div className="flex-1 border-t border-dashed border-paper-ruled" />
          <span className="text-[11px] font-bold uppercase tracking-widest font-hand text-desk">
            or set up your own
          </span>
          <div className="flex-1 border-t border-dashed border-paper-ruled" />
        </div>

        {/* Tab switcher */}
        <div className="mb-4 rounded-2xl p-1" style={{ background: '#e8dcc4', border: '1px solid #d8c6a8', boxShadow: 'inset 0 1px 2px rgba(93,58,31,0.08)' }}>
          <div
            className="flex gap-1"
          >
            {(['create', 'join'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setLobbyTab(t); setPackMenuOpen(false); }}
                aria-pressed={lobbyTab === t}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-all font-hand text-[14px] flex items-center justify-center gap-1.5"
                style={{
                  background: lobbyTab === t ? 'linear-gradient(180deg, #8b5e3c, #6b4423)' : 'transparent',
                  color: lobbyTab === t ? '#fffaf1' : '#6b4423',
                  boxShadow: lobbyTab === t ? '0 3px 6px rgba(74,48,23,0.24), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none',
                }}
              >
                {t === 'create' ? <><Pencil className="w-3.5 h-3.5" /> Create Room</> : <><KeyRound className="w-3.5 h-3.5" /> Join Room</>}
              </button>
            ))}
          </div>
        </div>

        {lobbyTab === 'create' ? (
          <div className="space-y-4">
            {/* Category pack */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-chalk-mark">
                <BookOpen className="w-3 h-3" /> Category Pack
              </p>
              {packsLoading ? (
                <div className="h-14 animate-pulse rounded-xl border bg-paper-line/50" />
              ) : packs.length > 0 ? (
                <div className="relative">
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={packMenuOpen}
                    aria-controls="category-pack-options"
                    onClick={() => setPackMenuOpen((open) => !open)}
                    className="flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all"
                    style={{ background: '#fffaf2', borderColor: '#dcc8a8', boxShadow: '0 3px 0 rgba(139,94,60,0.15), 0 8px 14px rgba(74,48,23,0.08)' }}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-chalk-board" style={{ background: 'linear-gradient(180deg, #f8dfbb, #e8ba84)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75), 0 2px 0 rgba(139,94,60,0.2)' }}>
                      <SelectedPackIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold font-hand text-[16px] text-ink-dark">
                        {selectedPack?.name ?? 'Choose a category pack'}
                      </span>
                      <span className="block truncate text-xs text-chalk-board">
                        {selectedPack?.description ?? 'Select the topics for your game'}
                      </span>
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f2e6d2]"><ChevronDown className={`h-4 w-4 text-chalk-board transition-transform ${packMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" /></span>
                  </button>
                  {packMenuOpen && (
                    <div id="category-pack-options" role="listbox" aria-label="Category packs" className="absolute inset-x-0 top-full z-20 mt-2 max-h-56 overflow-y-auto rounded-xl border border-paper-ruled bg-paper p-1.5 shadow-xl">
                      {packs.map((pack) => {
                        const PackIcon = categoryPackIcon(pack);
                        const isSelected = selectedPackId === pack.id;
                        return (
                          <button
                            key={pack.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => { setSelectedPackId(pack.id); setPackMenuOpen(false); }}
                            className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-[rgba(139,94,60,0.08)]"
                            style={{ background: isSelected ? 'rgba(107,68,35,0.1)' : 'transparent' }}
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(107,68,35,0.1)] text-chalk-mark">
                              <PackIcon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold text-chalk-board">{pack.name}</span>
                              <span className="block truncate text-xs text-chalk-mark">{pack.description}</span>
                            </span>
                            {isSelected && <Check className="h-4 w-4 shrink-0 text-chalk-mark" aria-hidden="true" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-xl border border-paper-ruled p-3 text-sm text-chalk-mark">No category packs are available.</p>
              )}
            </div>

            {/* Rounds selector */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-chalk-mark">
                <PenLine className="w-3 h-3" /> Number of Rounds
              </p>
              <div className="flex gap-2">
                {[3, 5, 7].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRounds(n)}
                    aria-pressed={rounds === n}
                    className="relative flex h-[68px] flex-1 flex-col items-center justify-center rounded-2xl border transition-all"
                    style={{
                      background: rounds === n ? 'linear-gradient(180deg, #8b5e3c, #603b20)' : '#fffaf2',
                      borderColor: rounds === n ? '#603b20' : '#dfc9a8',
                      color: rounds === n ? '#fffaf1' : '#1a1208',
                      boxShadow: rounds === n ? '0 4px 0 #472b18, 0 8px 12px rgba(74,48,23,0.16), inset 0 1px 0 rgba(255,255,255,0.16)' : '0 3px 0 rgba(139,94,60,0.16)',
                    }}
                  >
                    <span className="font-display text-[24px] leading-none">{n}</span>
                    <span className={`mt-1 text-[10px] leading-none ${rounds === n ? 'text-paper' : 'text-chalk-mark'}`}>rounds</span>
                    {rounds === n && <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-[#d39a28] bg-[#f4b531] text-[#5b381d] shadow-sm"><Check className="h-3 w-3" strokeWidth={3} /></span>}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-chalk-mark">
                <Timer className="w-3 h-3" /> Round Duration
              </p>
              <div className="flex gap-2">
                {[60, 90, 120].map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    aria-pressed={roundDuration === seconds}
                    onClick={() => setRoundDuration(seconds)}
                    className="flex-1 rounded-xl border py-2.5 font-bold font-hand transition-all"
                    style={{
                      background: roundDuration === seconds ? 'linear-gradient(180deg, #8b5e3c, #603b20)' : '#fffaf2',
                      borderColor: roundDuration === seconds ? '#603b20' : '#dfc9a8',
                      color: roundDuration === seconds ? '#fffaf1' : '#1a1208',
                      boxShadow: roundDuration === seconds ? '0 4px 0 #472b18, 0 7px 10px rgba(74,48,23,0.15)' : '0 3px 0 rgba(139,94,60,0.16)',
                    }}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl hidden border border-dashed px-3 py-2 text-center text-xs text-chalk-mark" style={{ background: 'rgba(255,250,242,0.7)', borderColor: '#caa878' }}>
              <span className="font-hand">Your match</span>
              <span className="mx-2 text-paper-ruled">|</span>
              <span className="font-bold text-chalk-board">{rounds} rounds / {roundDuration}s each / about {estimatedMinutes} min</span>
            </div>
          </div>
        ) : (
          <div>
            <p className="label-section mb-2 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Room Code
            </p>
            <div
              className="input-ruled"
              style={{
                border: `2px solid ${joinCode.length > 0 ? '#6b4423' : '#c8b89a'}`,
                boxShadow: joinCode.length > 0 ? '0 0 0 3px rgba(107,68,35,0.12)' : 'none',
              }}
            >
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="XXXXXX"
                className="w-full text-center text-3xl py-5 outline-none bg-transparent tracking-[0.2em] font-display text-ink-dark"
                style={{ caretColor: '#6b4423' }}
              />
            </div>
            <p className="text-sm mt-2 text-center font-hand text-desk">
              Ask your classmate for their 6-character code
            </p>
          </div>
        )}

      </div>


      {/* Fixed lobby action */}
      <div className="px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shrink-0" style={{ borderTop: '1px solid #dfc9a8', background: 'rgba(245,240,232,0.92)' }}>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleAction}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-2xl py-3.5 font-display text-[17px] text-white transition-all active:translate-y-0.5"
          style={{ opacity: isLoading ? 0.7 : 1, background: 'linear-gradient(180deg, #98643e, #603b20)', boxShadow: '0 4px 0 #472b18, 0 8px 15px rgba(74,48,23,0.2), inset 0 1px 0 rgba(255,255,255,0.2)' }}
        >
          {isLoading ? 'Connecting...' : lobbyTab === 'create' ? 'Create Room' : 'Join Room'}
          {!isLoading && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f2b533] text-[#593719]"><ArrowRight className="h-4 w-4" strokeWidth={3} /></span>}
        </motion.button>
      </div>

    
    </div>
  );
}
