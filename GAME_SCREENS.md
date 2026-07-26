# Naija Stop! — Game Screens Reference

This document describes each screen in the game, its purpose, what the user sees, and how navigation between screens works.

---

## Screen Flow

```
Landing → Avatar Setup → Lobby (Create/Join) → Room Lobby → Game Screen → Match Summary
                                                                              ↓
                                                                        (Rematch → new Room Lobby)
```

---

## 1. Landing Screen

**File:** `src/screens/LandingScreen.tsx`

**Purpose:** First screen users see. Handles authentication and entry into the game.

**What the user sees:**
- Game title "Naija Stop!" on a chalkboard-style card
- Subtitle describing the game
- "START PLAYING" button

**What happens:**
- On app load, guest authentication happens automatically in the background (via `POST /api/auth/guest`)
- Clicking "Start Playing" creates a minimal session and advances to Avatar Setup
- If a session already exists in localStorage, the user skips past this screen automatically

---

## 2. Avatar Setup Screen

**File:** `src/screens/AvatarSetupScreen.tsx`

**Purpose:** Player picks an avatar and enters their display name before joining any room.

**What the user sees:**
- Grid of 12 selectable avatar options (colored placeholders — real images to be added later)
- Display name text input (validated: 2-20 characters)
- "Continue" button (disabled until avatar selected + valid name)

**What happens:**
- Selected avatar key and display name are saved to the session store and persisted to localStorage
- On submit, navigates to the Lobby screen

---

## 3. Lobby Screen

**File:** `src/screens/LobbyScreen.tsx`

**Purpose:** Player chooses to either create a new room or join an existing one.

**What the user sees:**
- Welcome message with player's display name
- Tab switcher: "Create Room" / "Join Room"

**Create Room tab:**
- Category pack dropdown (fetched from `GET /api/categories/packs`)
- Number of rounds selector (1, 3, 5, 7, 10)
- "Create Room" button

**Join Room tab:**
- 6-character room code input (auto-uppercased, validated with Zod)
- "Join Room" button

**What happens:**
- Create: calls `POST /api/rooms` with settings, then emits `join-room` on socket with the returned room code
- Join: calls `POST /api/rooms/:code/join`, then emits `join-room` on socket
- Both navigate to Room Lobby after socket receives `state-snapshot`

---

## 4. Room Lobby Screen

**File:** `src/screens/RoomLobbyScreen.tsx`

**Purpose:** Waiting room where all players gather before the game starts. Host controls when to begin.

**What the user sees:**
- Room code displayed prominently (shareable with friends)
- Player count
- List of all connected players with their avatars and display names
- Host badge on the room creator
- "Start Game" button (visible only to the host)
- "Waiting for host..." message for non-host players

**What happens:**
- Real-time updates via socket events (`player-connected`, `player-disconnected`)
- Host clicks "Start Game" → emits `start-game` { roomCode }
- When server sends `round-start`, all players transition to Game Screen

---

## 5. Game Screen

**File:** `src/screens/GameScreen.tsx`

**Purpose:** The main gameplay screen. Cycles through multiple phases per round.

### Phase: Input (and Grace)

**What the user sees:**
- Large countdown timer at the top (starts at 1:30, formatted as `1:30`)
- The assigned letter displayed on a chalkboard-style card
- Category input fields styled as notebook ruled lines (one per category, numbered)
- "STOP!" button at the bottom (enabled only when all fields are filled)

**What happens:**
- Player types answers for each category starting with the assigned letter
- Each keystroke is debounced (300ms) and emitted as `answer-submit` { roomCode, category, answer }
- Answers are persisted to localStorage as backup
- Clicking STOP emits `stop-round` { roomCode } → triggers grace period for all players
- During grace: timer switches to 15-second countdown in red, "Grace period" label shown
- STOP button disables after clicking (one use per round)

### Phase: Locked

**What the user sees:**
- All inputs disabled (grayed out) with answers still visible
- "Scoring in progress..." message with loading animation
- Timer shows 0:00

**What happens:**
- Server sent `round-locked` event → all inputs disabled
- Waiting for `round-results` from server

### Phase: Results

**What the user sees:**
- **Answers table** (shown first, auto-switches to ranking after 8s):
  - Grid showing all players as rows, categories as columns
  - Each cell shows the player's answer with ✓ (valid/scored) or ✗ (invalid/zero)
  - Duplicates marked with "D"
  - Round score for each player in the last column
  - "View Ranking →" button to skip ahead

- **Ranking view** (shown after 8s or on button click):
  - Players sorted by total score descending
  - Movement arrows (▲/▼) showing position changes from previous round
  - Round score gained (+X) and cumulative total

**What happens:**
- Server sends `round-results` with full scoring breakdown for all players
- After the results hold period, server sends next `round-start` → loops back to Input phase
- If it was the final round, server sends `match-summary` instead → navigates to Match Summary

---

## 6. Match Summary Screen

**File:** `src/screens/MatchSummaryScreen.tsx`

**Purpose:** Final results after all rounds are complete. Podium display with sharing and rematch options.

**What the user sees:**
- "Match Complete!" header with game duration
- Podium showing top players with medals (🥇🥈🥉), avatars, names, and scores
- Current player highlighted
- Action buttons:
  - "🔄 Request Rematch" — starts the rematch flow
  - "📸 Share Victory Card" — generates and downloads/shares an image card
- Rematch progress UI (when active)

### Rematch Flow:
1. Any player clicks "Request Rematch" → emits `request-rematch` { roomCode }
2. Other players see a prompt: "{Name} wants a rematch!" with Accept/Decline buttons
3. Progress counter shows how many have accepted
4. After 30s timeout or all respond → server creates new room
5. Server sends `rematch-ready` { newRoomCode } → accepting players auto-navigate to new Room Lobby
6. Players who declined stay on the summary screen

---

## 7. Save Progress Prompt

**File:** `src/screens/SaveProgressPrompt.tsx`

**Purpose:** Prompts anonymous/guest players to sign in with Google to save their progress and appear on leaderboards.

**What the user sees:**
- Google Sign-In CTA
- "Skip" option to proceed without signing in

**What happens:**
- Only shown for guest (unauthenticated) players after a match ends
- Signing in upgrades the account and persists scores
- Skipping navigates to Leaderboards

---

## 8. Leaderboard Screen

**File:** `src/screens/LeaderboardScreen.tsx`

**Purpose:** Shows all-time and weekly player rankings.

**What the user sees:**
- Tab toggle: "All-Time" / "Weekly"
- Virtualized list of ranked players (handles thousands of entries)
- Each row: rank number, avatar, display name, total score
- Current player highlighted with "(you)" label
- "Play Again 🎮" button at the bottom

**What happens:**
- Fetches data from `GET /api/leaderboard/all-time` or `/weekly`
- Play Again resets room/round state and navigates back to Lobby

---

## Global UI Elements

These appear across multiple screens:

### Connectivity Indicator
- Fixed top-right corner
- Green dot = connected, amber dot + latency = degraded, "Offline" = disconnected

### Reconnect Banner
- Fixed bottom banner when another player disconnects
- Shows their name and countdown to elimination
- Dismisses on reconnection or expiry

### Connection Lost Overlay
- Full-screen overlay after 5 failed reconnection attempts
- "Retry Connection" button

### Toast Notifications (Sonner)
- Grace triggered: "⚡ {Name} said STOP! 10 seconds left."
- Player joined: "{Name} joined the room"
- Rematch requested: "{Name} wants a rematch!"
- Server errors: shown as error toasts

---


