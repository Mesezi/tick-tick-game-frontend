import { lazy, Suspense } from 'react';
import { useGameStore } from '../store/gameStore';
import { deriveScreen } from './screenRouter';
import type { Screen } from './screenRouter';
import { LandingScreen } from '../screens/LandingScreen';
import { AvatarSetupScreen } from '../screens/AvatarSetupScreen';
import { LobbyScreen } from '../screens/LobbyScreen';
import { RoomLobbyScreen } from '../screens/RoomLobbyScreen';
import { GameScreen } from '../screens/GameScreen';
import { SaveProgressPrompt } from '../screens/SaveProgressPrompt';
// import { LeaderboardScreen } from '../screens/LeaderboardScreen';

const MatchSummaryScreen = lazy(() =>
  import('../screens/MatchSummaryScreen').then(({ MatchSummaryScreen }) => ({
    default: MatchSummaryScreen,
  })),
);

const screenComponents: Record<Screen, React.ComponentType> = {
  'landing': LandingScreen,
  'avatar-setup': AvatarSetupScreen,
  'lobby': LobbyScreen,
  'room-lobby': RoomLobbyScreen,
  'game': GameScreen,
  'match-summary': MatchSummaryScreen,
  'save-progress': SaveProgressPrompt,
  // 'leaderboard': LeaderboardScreen,
};

/**
 * ScreenRouter subscribes to the Zustand store and renders
 * the correct screen based on the derived game state.
 */
export function ScreenRouter() {
  const session = useGameStore((s) => s.session);
  const room = useGameStore((s) => s.room);
  const round = useGameStore((s) => s.round);
  const matchResults = useGameStore((s) => s.matchResults);
  const hasPassedLanding = useGameStore((s) => s.hasPassedLanding);

  const activeScreen = deriveScreen({ session, room, round, matchResults, hasPassedLanding });
  const ScreenComponent = screenComponents[activeScreen];

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center font-hand text-chalk-mark" role="status">
          Loading...
        </div>
      }
    >
      <ScreenComponent />
    </Suspense>
  );
}
