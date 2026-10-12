# Tick Tick

Tick Tick is a free, real-time multiplayer word game inspired by the classic
category game played with pen and paper. Choose a letter, think of an answer for
each category, and enter them before another player calls **STOP!**

**Play online:** [playticktick.com](https://playticktick.com)

## How to play

1. Start playing and choose a player name and avatar.
2. Join a quick match, create a room and share its invite link, or enter a
   friend's room code. Opening a `/join/CODE` invite joins the room after profile
   setup when needed.
3. In each round, use the displayed letter to fill in an answer for every
   category.
4. Submit your answers before time runs out, or call **STOP!** to start the
   final countdown.
5. Review the validated answers and scores, then continue through the match to
   see the final standings.
6. Request or accept a rematch after the match.

## Features

- Real-time multiplayer rooms with room codes and quick matchmaking.
- Custom rooms with selectable category packs and a choice of 3, 5, or 7 rounds.
- Timed rounds, answer submission, and a stop/grace-period mechanic.
- Server-validated answer reveals, round scoreboards, and match standings.
- Rematch voting and shareable match results.
- Player avatars, guest play, and optional account sign-in.
- Installable Progressive Web App (PWA) for supported devices.

## Run locally

### Requirements

- Node.js and npm.
- A running Tick Tick backend. The frontend uses HTTP APIs for accounts, rooms,
  and category packs, and Socket.IO for real-time gameplay.

### Setup

```sh
npm install
```

Create a `.env.local` file in the project root and set the backend URL:

```dotenv
VITE_API_URL=http://localhost:4000
```

If the backend runs at a different address, use that URL instead. Its CORS
configuration must allow the frontend's development origin.

Start the development server:

```sh
npm run dev
```

Vite prints the local URL when the server starts.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Type-check and build the production app into `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run the test suite once. |
| `npm run generate-icons` | Generate PWA icons from the game logo. |

## PWA artwork

PWA icons are generated from [`public/tick-tick-logo.png`](public/tick-tick-logo.png):

```sh
npm run generate-icons
```

The script writes `pwa-192.png` and `pwa-512.png` for the app manifest. The PWA
uses a plain background color and its app icon for the platform-generated launch
screen.

## Built with

- React and TypeScript
- Vite
- Zustand for client-side game state
- Socket.IO for real-time multiplayer events
- Tailwind CSS and Motion for styling and animation
