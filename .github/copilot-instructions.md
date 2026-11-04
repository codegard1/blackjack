# Copilot Instructions

This repository contains Chris's blackjack game built with React and TypeScript.

## Project Overview

A browser-based blackjack game where one human player competes against a dealer that hits below 17 and stands otherwise. Game and settings state persist in `localStorage`, so a reload resumes the current game.

## Technologies Used

- **React** 19 with function components and hooks
- **TypeScript** 6 (strict mode)
- **Fluent UI** v9 (`@fluentui/react-components`, `@fluentui/react-icons`)
- **Vite** 8 for the dev server and build (`@vitejs/plugin-react`, `@vitejs/plugin-legacy`)
- **Vitest** 5 with jsdom and React Testing Library
- **ESLint** 8 with the TypeScript, React, jsx-a11y and import plugins

## Setup and Commands

Node.js 22.22+, 24.15+ or 26+ (see `engines` in `package.json`; `.nvmrc` pins 22).

```bash
npm install --legacy-peer-deps   # install dependencies
npm start                        # dev server on http://localhost:3000
npm test                         # run the test suite once (vitest run)
npm run test:watch               # tests in watch mode
npm run typecheck                # tsc --noEmit
npm run lint                     # eslint over src/**/*.{ts,tsx}
npm run build                    # typecheck, then build to dist/
```

Run `npm test`, `npm run typecheck` and `npm run lint` before committing.

## Project Structure

```
src/
├── classes/       # PlayingCard, PlayingCardDeck (cards and hands), PlayerStore (players, banks, stats)
├── components/    # React components (Table, PlayerContainer, ControlPanel, Agent, ActivityLog, ...)
├── context/       # GameContext and SettingContext, default state, useGameContext/useSettingContext
├── enums/         # GameAction, GameStatus, PlayerAction, StoreName, ...
├── functions/     # gameReducer, settingReducer, evaluateGame, persistence, helpers
├── interfaces/    # TypeScript interfaces
├── types/         # TypeScript types (GameState, SettingsState, DeckState, ...)
├── App.tsx        # Root component: reducers, persistence effects, providers
└── index.tsx      # Entry point
```

## Architecture

- **State**: `App.tsx` holds two `useReducer` stores, game state (`gameReducer`) and settings (`settingReducer`), and exposes them through context. Components read state with `useGameContext()` / `useSettingContext()` and dispatch actions; they do not mutate state directly.
- **Game flow**: `NewGame` creates players and hands; `Deal` deals two cards each and resolves natural blackjacks; `Draw`, `Stay`, `Bet` and `DoubleDown` drive a turn; the dealer's turn is automated by `components/Agent.tsx`. Outcomes are `HumanWins`, `DealerWins` or `Push`.
- **Settlement**: whenever `gameStatus` changes, `App.tsx` dispatches `EvaluateGame`. `functions/evaluateGame.ts` antes at the start of a game and settles finished rounds (pot payout, 3:2 natural bonus, push refunds, stats). Settlement is guarded by `gameStatusFlag` so a round is paid only once.
- **Persistence**: `functions/persistence.ts` loads and saves the deck, player store, a versioned game snapshot and settings. Bump `GAME_STORE_VERSION` whenever the saved shape or `GameStatus` values change.
- **Logging**: use `debugLog` from `functions/debugLog.ts` instead of `console.log`; it only logs in development.

## Code Style and Conventions

- Use TypeScript strict mode and explicit types for function parameters and return values.
- Define interfaces in `interfaces/`, types in `types/`, enums in `enums/`.
- Use function components with hooks and Fluent UI v9 components.
- Import through the `index.ts` barrel files where they exist.
- Keep game rules in reducers and `functions/`, not in components.

## Testing

- Tests are named `*.test.ts` / `*.test.tsx` and live next to the code they cover.
- `src/setupTests.ts` loads jest-dom matchers, stubs `ResizeObserver`, mocks `react-syntax-highlighter`, and clears `localStorage` after each test.
- Make dealt cards deterministic in tests (set `deck.cards`, or spy on `PlayingCardDeck.prototype.deal`), since a random natural blackjack ends the round immediately.

## Building and Deployment

- `npm run build` outputs a static site to `dist/`.
- The site is hosted on Azure Static Web Apps.

## Development Guidelines

1. Make focused changes that match existing patterns.
2. Add or update tests for rule and reducer changes.
3. Update `README.md` when adding significant features.
