# Naija Categories Game — Frontend Integration Guide

## Overview

This document covers everything needed to build a frontend client for the Naija Categories Game backend. The backend exposes:
- **REST API** (Express) for auth, room management, categories, and leaderboards
- **WebSocket layer** (Socket.io) for real-time gameplay

Base URL: `http://localhost:4000` (configurable via `PORT` env)

---

## 1. Authentication

All authenticated endpoints require: `Authorization: Bearer <token>`

### Guest Login (instant play, no signup)

```
POST /api/auth/guest
Content-Type: application/json

{
  "deviceId": "550e8400-e29b-41d4-a716-446655440000"  // UUID v4
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "guestId": "clx..."
  }
}
```

Generate a UUID on first app launch, persist it locally (localStorage/AsyncStorage). Same deviceId = same guest account.

### Google OAuth

```
POST /api/auth/google
Content-Type: application/json

{
  "code": "<google_authorization_code>"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "clx...",
      "email": "user@gmail.com",
      "displayName": "John"
    }
  }
}
```

Frontend must handle the Google OAuth consent flow and pass the resulting authorization code.

### Get Current User

```
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx...",
      "type": "GUEST",
      "email": null,
      "displayName": null,
      "totalScore": 0,
      "weeklyScore": 0,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

## 2. Category Packs

### List All Packs

```
GET /api/categories/packs
Authorization: Bearer <token>
```

### Get Single Pack

```
GET /api/categories/packs/:id
Authorization: Bearer <token>
```

---

## 3. Room Management (REST)

### Create Room (becomes host)

```
POST /api/rooms
Authorization: Bearer <token>
Content-Type: application/json

{
  "categoryPackId": "clx...",
  "roundDuration": 60,       // 30–120 seconds
  "totalRounds": 5,          // 1–10 rounds
  "displayName": "PlayerName" // 1–30 chars
}
```

**Response includes:** `roomCode` (6-char uppercase string), room details.

### Join Room

```
POST /api/rooms/:code/join
Authorization: Bearer <token>
Content-Type: application/json

{
  "roomCode": "ABC123",
  "displayName": "PlayerName"
}
```

### Get Room State

```
GET /api/rooms/:code
Authorization: Bearer <token>
```

---

## 4. Leaderboard

```
GET /api/leaderboard/all-time?page=1&limit=20
GET /api/leaderboard/weekly?page=1&limit=20
```

No auth required (optional auth to highlight current user's position).

---

## 5. WebSocket Connection (Socket.io)

### Connecting

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  auth: {
    token: "<jwt_token>"  // Same token from REST auth
  }
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);
});

socket.on("connect_error", (err) => {
  // err.message === "AUTH_FAILED" if token is invalid/expired
  console.error("Connection failed:", err.message);
});
```

### Client → Server Events

| Event | Payload | When to emit |
|-------|---------|--------------|
| `join-room` | `{ roomCode: "ABC123" }` | After REST join, to enter the live room |
| `start-game` | `{ roomCode: "ABC123" }` | Host only, from lobby |
| `answer-submit` | `{ roomCode: "ABC123", category: "Food", answer: "Nkwobi" }` | During active round |
| `stop-round` | `{ roomCode: "ABC123" }` | Player finished early, triggers grace timer |
| `time-sync` | `{ roomCode: "ABC123" }` | Request server time for clock drift correction |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `state-snapshot` | Full room state (see below) | Received on join/reconnect |
| `player-connected` | `{ playerId, displayName }` | Someone joined the room |
| `player-disconnected` | `{ playerId, displayName }` | Someone lost connection |
| `player-reconnected` | `{ playerId, displayName }` | Someone came back |
| `player-eliminated` | `{ playerId, displayName }` | Player missed reconnect window |
| `round-start` | `{ roundNumber, letter, categories, endTimestamp }` | New round begins |
| `answer-ack` | `{ category, timestamp }` | Server confirmed your answer was saved |
| `grace-started` | `{ triggeredBy: { playerId, displayName }, graceEndTimestamp }` | Someone hit stop, 10s grace |
| `round-locked` | `{ roundNumber }` | No more submissions accepted |
| `round-results` | Full scoring breakdown (see below) | Round scoring complete |
| `match-summary` | Final results with podium | All rounds done |
| `room-closed` | `{ roomCode }` | Room lifecycle ended |
| `scores-updated` | Same shape as round-results | AI re-evaluation corrected scores |
| `state-transition` | `{ from, to, metadata }` | Room state machine changed |
| `time-sync-response` | `{ serverTime }` | Server UTC timestamp (ms) |
| `error` | `{ code, message, event? }` | Something went wrong |
| `validation-error` | `{ event, errors }` | Payload validation failed |

---

## 6. Complete Game Flow (Screen by Screen)

### Screen 1: Home / Landing

**Purpose:** Auth + entry point

```javascript
// On app load, check for existing token
const token = localStorage.getItem("token");
if (!token) {
  // First time user — create guest account
  const deviceId = localStorage.getItem("deviceId") || crypto.randomUUID();
  localStorage.setItem("deviceId", deviceId);

  const res = await fetch("http://localhost:4000/api/auth/guest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });
  const { data } = await res.json();
  localStorage.setItem("token", data.token);
}

// Show two options: "Create Room" or "Join Room"
```

### Screen 2: Create Room

**Purpose:** Host picks settings and creates a room

```javascript
// 1. Fetch available category packs
const res = await fetch("http://localhost:4000/api/categories/packs", {
  headers: { Authorization: `Bearer ${token}` },
});
const { data } = await res.json();
// data.packs = [{ id, name, description, categories }, ...]

// 2. Host picks a pack, sets duration + rounds, enters display name
// UI: Pack selector, slider for duration (30-120s), rounds (1-10), name input

// 3. Create the room
const createRes = await fetch("http://localhost:4000/api/rooms", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    categoryPackId: selectedPack.id,
    roundDuration: 60,
    totalRounds: 5,
    displayName: "HostName",
  }),
});
const { data: roomData } = await createRes.json();
// roomData = { id, code: "ABC123", status: "LOBBY", ... }

// 4. Navigate to Lobby screen with roomData.code
```

### Screen 3: Join Room

**Purpose:** Player enters a room code shared by the host

```javascript
// 1. Player enters 6-character room code + their display name
// UI: Text input for code, text input for name

// 2. Join via REST
const res = await fetch(`http://localhost:4000/api/rooms/${roomCode}/join`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    roomCode: "ABC123",
    displayName: "PlayerName",
  }),
});

// 3. Navigate to Lobby screen with the room code
```

### Screen 4: Lobby (Waiting Room)

**Purpose:** All players wait here. Host starts the game.

```javascript
import { io } from "socket.io-client";

// 1. Connect socket
const socket = io("http://localhost:4000", {
  auth: { token },
});

// 2. Join the socket room
socket.emit("join-room", { roomCode: "ABC123" });

// 3. Receive full state on join
socket.on("state-snapshot", (snapshot) => {
  // snapshot.room.hostId — compare with your userId to know if you're host
  // snapshot.players — render player list
  // snapshot.room.status — should be "LOBBY"
  setPlayers(snapshot.players);
  setIsHost(snapshot.room.hostId === myUserId);
});

// 4. Listen for others joining/leaving
socket.on("player-connected", ({ playerId, displayName }) => {
  // Add to player list UI
});
socket.on("player-disconnected", ({ playerId, displayName }) => {
  // Mark as disconnected or remove from UI
});

// 5. Host starts the game (button click)
function handleStartGame() {
  socket.emit("start-game", { roomCode: "ABC123" });
}

// 6. Listen for round-start (game has begun!)
socket.on("round-start", (payload) => {
  // Navigate to Active Round screen
  // payload = { roundNumber, letter, categories, endTimestamp }
});

// 7. Handle errors
socket.on("error", ({ code, message }) => {
  if (code === "PERMISSION_DENIED") alert("Only the host can start");
  if (code === "NOT_A_MEMBER") alert("You need to join this room first");
});
```

### Screen 5: Active Round (Gameplay)

**Purpose:** Players type answers for each category

```javascript
// State from round-start event:
// { roundNumber: 1, letter: "N", categories: ["Food","Animals","Cities","Names","Movies"], endTimestamp: 1706000060000 }

// 1. Start countdown
const remaining = endTimestamp - Date.now(); // e.g., 60000ms
startCountdownTimer(remaining);

// 2. Render one input per category
// UI: Letter displayed prominently, 5 text inputs labeled with categories

// 3. On each input change (debounced ~300ms), emit answer
function handleAnswerChange(category, answer) {
  socket.emit("answer-submit", {
    roomCode: "ABC123",
    category,    // e.g., "Food"
    answer,      // e.g., "Nkwobi"
  });
}

// 4. Listen for answer-ack (shows checkmark/saved indicator)
socket.on("answer-ack", ({ category, timestamp }) => {
  // Show "saved" indicator next to that category's input
  markCategorySaved(category);
});

// 5. Player finished early — trigger stop (optional)
function handleStopRound() {
  socket.emit("stop-round", { roomCode: "ABC123" });
}

// 6. Grace timer started by someone
socket.on("grace-started", ({ triggeredBy, graceEndTimestamp }) => {
  // Show: "{triggeredBy.displayName} stopped! 10s remaining..."
  // Switch countdown to: graceEndTimestamp - Date.now()
  const graceRemaining = graceEndTimestamp - Date.now();
  startGraceCountdown(graceRemaining);
});

// 7. Round locked — disable all inputs
socket.on("round-locked", ({ roundNumber }) => {
  disableAllInputs();
  showMessage("Time's up! Scoring...");
});

// 8. Wait for round-results to navigate to results screen
socket.on("round-results", (results) => {
  navigateToResults(results);
});
```

### Screen 6: Round Results

**Purpose:** Show scoring breakdown for 15 seconds

```javascript
// Received from "round-results" event:
// { roundNumber, letter, categories, players: [{ playerId, displayName, roundScore, totalScore, answers: [...] }] }

// UI: Show each player's answers with scores
// - Green: valid (10/9/7 pts)
// - Yellow: duplicate (5 pts)
// - Red: invalid (0 pts)
// - Show severity badges: "exact", "minor typo", "major typo"

// Auto-advance after 15s — listen for next event:
socket.on("round-start", (payload) => {
  // Next round! Navigate back to Active Round screen
});

socket.on("match-summary", (payload) => {
  // Game over! Navigate to Match Summary screen
});

// Also listen for score corrections (AI re-evaluated)
socket.on("scores-updated", (updatedResults) => {
  // Re-render the results table with corrected scores
  // Show a "Scores updated" toast
});
```

### Screen 7: Match Summary (Game Over)

**Purpose:** Final rankings, podium, share

```javascript
// Received from "match-summary" event:
// {
//   podium: [{ rank: 1, playerId, displayName, totalScore }, ...],  // top 3
//   allPlayers: [{ playerId, displayName, totalScore }, ...],       // all ranked
//   totalDuration: 300000,  // 5 min match
//   shareCardUrl: "/api/rooms/ABC123/share-card"
// }

// UI: Show podium (1st, 2nd, 3rd), full leaderboard, "Share" button, "Play Again"

// Listen for room closed
socket.on("room-closed", ({ roomCode }) => {
  // Room is done. "Play Again" navigates back to Home.
  // Disconnect socket or leave it for reuse.
});
```

---

## 7. Complete Socket.io Event Lifecycle Diagram

```
HOST                          SERVER                        PLAYER 2
 |                               |                              |
 |-- POST /api/rooms ----------->|                              |
 |<-- { code: "ABC123" } --------|                              |
 |                               |                              |
 |                               |<-- POST /rooms/ABC123/join --|
 |                               |-- { success } -------------->|
 |                               |                              |
 |== Socket.io connect =========>|<===== Socket.io connect =====|
 |                               |                              |
 |-- emit "join-room" --------->|<---- emit "join-room" --------|
 |<-- "state-snapshot" ---------|--- "state-snapshot" --------->|
 |<-- "player-connected" -------|                              |
 |                               |                              |
 |-- emit "start-game" -------->|                              |
 |<-- "round-start" ------------|--- "round-start" ----------->|
 |   { letter:"N", categories,  |                              |
 |     endTimestamp }            |                              |
 |                               |                              |
 |-- emit "answer-submit" ----->|<-- emit "answer-submit" -----|
 |<-- "answer-ack" -------------|--- "answer-ack" ------------>|
 |                               |                              |
 |                               |<-- emit "stop-round" --------|
 |<-- "grace-started" ----------|--- "grace-started" --------->|
 |   { triggeredBy, graceEnd }  |                              |
 |                               |                              |
 |        ... 10 seconds pass ...|                              |
 |                               |                              |
 |<-- "round-locked" -----------|--- "round-locked" ---------->|
 |                               |                              |
 |        ... scoring pipeline ..|                              |
 |                               |                              |
 |<-- "round-results" ----------|--- "round-results" --------->|
 |                               |                              |
 |        ... 15 seconds hold ...|                              |
 |                               |                              |
 |<-- "round-start" (round 2) --|--- "round-start" ---------->|
 |        ... repeat ...         |                              |
 |                               |                              |
 |<-- "match-summary" ----------|--- "match-summary" --------->|
 |<-- "room-closed" ------------|--- "room-closed" ----------->|
```

---

## 8. Key Payload Shapes

### state-snapshot

```typescript
{
  room: {
    code: string;
    status: "LOBBY" | "IN_PROGRESS" | "ROUND_SCORING" | "ROUND_SUMMARY" | "MATCH_SUMMARY" | "CLOSED";
    hostId: string;
    roundDuration: number;
    totalRounds: number;
    currentRound: number;
    currentLetter: string | null;
  };
  players: {
    id: string;
    userId: string;
    displayName: string;
    status: "CONNECTED" | "DISCONNECTED" | "ELIMINATED";
    totalScore: number;
  }[];
  currentRound: {
    roundNumber: number;
    letter: string;
    categories: string[];
    endTimestamp: number | null;   // absolute UTC ms
    graceEndTimestamp: number | null;
    isLocked: boolean;
  } | null;
  myAnswers: Record<string, string>;  // category → answer (restored on reconnect)
}
```

### round-results

```typescript
{
  roundNumber: number;
  letter: string;
  categories: string[];
  players: {
    playerId: string;
    displayName: string;
    roundScore: number;
    totalScore: number;
    answers: {
      category: string;
      rawAnswer: string;
      normalizedForm: string | null;
      isValid: boolean;
      severity: "exact_match" | "minor_typo" | "major_typo" | "invalid";
      score: number;        // 10, 9, 7, 5 (duplicate), or 0
      isDuplicate: boolean;
      reason?: string;
    }[];
  }[];
}
```

### match-summary

```typescript
{
  podium: { rank: number; playerId: string; displayName: string; totalScore: number }[];
  allPlayers: { playerId: string; displayName: string; totalScore: number }[];
  totalDuration: number;  // ms
  shareCardUrl: string;
}
```

---

## 8. Timer Handling

All timers are server-authoritative. The server sends absolute UTC timestamps:

```javascript
// On "round-start"
const remaining = payload.endTimestamp - Date.now();
startCountdown(remaining);

// On "grace-started"  
const graceRemaining = payload.graceEndTimestamp - Date.now();
startGraceCountdown(graceRemaining);
```

For clock drift correction, periodically emit `time-sync` and use the response to calculate offset:

```javascript
socket.emit("time-sync", { roomCode });
socket.on("time-sync-response", ({ serverTime }) => {
  const offset = serverTime - Date.now();
  // Apply offset when calculating countdowns
});
```

---

## 9. Error Codes

| Code | Meaning |
|------|---------|
| `AUTH_FAILED` | Invalid/expired JWT on socket connect |
| `NOT_IN_ROOM` | Socket hasn't joined the target room |
| `NOT_A_MEMBER` | Player not in room's player list (didn't REST join) |
| `PERMISSION_DENIED` | Non-host tried host action |
| `ROUND_LOCKED` | Submitted answer after timer expired |
| `INVALID_STATE` | Action not valid for current room state |
| `ROOM_NOT_FOUND` | Room code doesn't exist |
| `PLAYER_ELIMINATED` | Eliminated player tried to submit |

---

## 10. Reconnection

Socket.io handles transport-level reconnection automatically. On reconnect:

1. Socket.io re-establishes connection (auth token is re-verified)
2. Frontend re-emits `join-room` with the room code
3. Server detects it's a reconnection (player was DISCONNECTED)
4. Server sends fresh `state-snapshot` including `myAnswers` (previously submitted answers)
5. Frontend restores UI from snapshot

**Grace window:** If the player reconnects before the next round starts, they're back in the game. If they miss the start of a new round, they're eliminated (but keep their earned points).

---

## 11. Throttling & Limits

- `answer-submit`: max 2 per second (excess silently dropped)
- `stop-round`: max 1 per player per round
- Global: 30+ events/sec → socket forcibly disconnected
- Room code: exactly 6 uppercase characters
- Display name: 1–30 characters
- Answer text: max 100 characters
- Round duration: 30–120 seconds
- Total rounds: 1–10
- Max players per room: limited by category pack (typically 2–8)

---

## 12. Scoring System

| Condition | Points |
|-----------|--------|
| Exact match (valid, correct) | 10 |
| Minor typo | 9 |
| Major typo | 7 |
| Duplicate answer (same as another player) | 5 |
| Fallback (AI timeout) | 5 |
| Invalid / wrong letter / empty | 0 |

The AI judge understands Nigerian English, Pidgin, and local dialects. "Suya" for food starting with S is valid. Answers are normalized (lowercased, trimmed) before duplicate comparison.

---

## 13. Suggested Tech Stack (Frontend)

- **Framework:** React / Next.js or React Native (mobile)
- **Socket.io client:** `socket.io-client` v4
- **State management:** Zustand or React Context (game state from snapshots)
- **HTTP client:** fetch or axios
- **Timer display:** Use `requestAnimationFrame` or `setInterval` with server offset correction
- **UUID generation:** `crypto.randomUUID()` (browser) or `uuid` package

---

## 14. Environment

```
VITE_API_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
```

The backend CORS is configured to accept requests from the origin specified in `CORS_ORIGIN` (currently `http://localhost:3000`). Update backend `.env` if your frontend runs on a different port.
