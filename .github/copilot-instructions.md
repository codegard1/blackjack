# Blackjack Project Instructions

This repository is a browser-based blackjack game where one human plays against a dealer who hits below 17. Game and settings state persist in `localStorage`. It is built with React 19, TypeScript 6, Fluent UI v9, Vite 8, and Vitest 5.

## Architecture

- `src/App.tsx` owns the game, settings, and profile reducers and provides state through React context. Components read state with the relevant context hooks and dispatch actions; keep shared state changes in reducers.
- Game rules and state transitions belong in `src/functions/` and `src/classes/`, not in UI components. `src/components/Agent.tsx` automates the dealer's turn.
- `src/functions/evaluateGame.ts` handles antes, round settlement, payouts, and stats. `src/functions/profiles.ts` manages player profiles, profile statistics, and the seats for a new game. `src/functions/persistence.ts` restores and saves the deck, player store, game snapshot, settings, and profiles in `localStorage`.
- There is no splash screen. Before a game, `src/components/Table.tsx` shows the selected player and dealer as chips with a Start game button. `src/components/PlayersDialog.tsx`, opened from the header, creates/selects human profiles and displays lifetime statistics. Profile data persists separately from the active game; clearing application data resets it.
- Tests live beside the code they cover. See the scoped instructions in `.github/instructions/` for game logic, UI, and test-specific guidance.

## Development

- Use strict TypeScript and the existing interfaces, types, enums, class methods, and barrel exports where available. Follow nearby code style and avoid unrelated refactors.
- Use `debugLog` from `src/functions/debugLog.ts` for development-only diagnostics.
- Update the README when adding a significant player-facing feature.
- Use Node.js versions allowed by `package.json` (`.nvmrc` pins Node 22).

Common commands:

```bash
npm start
npm test
npm run typecheck
npm run lint
npm run build
```

Run the relevant tests and checks for each change. Before finishing a code change, run `npm test`, `npm run typecheck`, and `npm run lint` when practical; `npm run build` also type-checks before producing `dist/`.
