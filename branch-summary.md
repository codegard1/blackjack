# Branch summary: `claude/fast-forward-9fb9d09-90q1jw`

Repository: `codegard1/blackjack` (React 19, TypeScript, Vite, Fluent UI v9, Vitest).

**Current head:** `cf6faed`, pushed to `origin/claude/fast-forward-9fb9d09-90q1jw`.
**Checks at head:** 9 test files, 93 tests passing. `npm run typecheck` and `npm run lint` are clean. `npm run build` passes.

## Setup and commands

```bash
npm install --legacy-peer-deps   # the repo needs this flag
npm test                         # vitest run
npm run typecheck                # tsc --noEmit
npm run lint                     # eslint over src/**/*.{ts,tsx}
npm run build
npm start                        # dev server on port 3000
```

## History on this branch

1. **Fast-forward (start of session).** The branch went from `838b9ca` to `9fb9d09`, which brought in 14 commits: app logo, sticky header with About dialog, Fluent restyling of seats and controls, and the stacked table layout.
2. **Merges from `master` and the remote.** Dependency bumps, JSDoc on `evaluateGame`, and new `.github/instructions/*` files. Another session also pushed to this branch, so I merged it in rather than force-pushing.
3. **Work from this session**, listed below. Each item is a commit on the branch.

## Changes, in order

### 1. Seats collapse into chips; the seat in control takes the right two thirds (`4515cd7`)
- Before a game starts, seats are floating, left-aligned chips (name and bank).
- In play, the seat in control expands into the right 2/3 of the board. On boards under 720px it takes the full width.
- Other seats collapse into a left rail of chips. Clicking a chip pins that seat until control next moves.
- Files: `components/Table.tsx`, `Table.css`, `SeatChip.tsx`, `PlayerContainer.tsx`, `PlayerContainer.css`, `components/index.ts`, `interfaces/ISeatChipProps.ts`.

### 2. Card sizing (`4515cd7`)
- A player's hand is a `.card-row` container with a fixed 2:1 aspect box (4:3 on narrow boards).
- Cards are sized with container query units to the largest size that fits.
- Files: `CardContainer.css`, `CardContainer.tsx`, `CardStack.tsx`.

### 3. Dealer autoplay is headless (`4515cd7`)
- `Agent` renders nothing. It is mounted by `Table`, so the dealer keeps playing while its seat is collapsed.
- Files: `components/Agent.tsx`, `Agent.test.tsx`.

### 4. Toast notices over the table (`4515cd7`)
- Turn changes, dealer hits and stands, busts, blackjacks, and round results appear as large animated notices.
- Notices are derived from snapshots of the game state, so the reducer and persistence are unchanged.
- Files: `functions/announcements.ts` (pure diff logic), `components/TableToasts.tsx`, `types/Announcement.ts`, `functions/announcements.test.ts`.

### 5. Hands shown in the rail (`948065e`)
- Collapsed seats show their cards as small mini cards under the name.
- The dealer's hole card stays face down unless "Show Dealer Hand" is on.
- `CardStack` has a `variant="mini"` option.

### 6. Pacing (`562ab2f`)
- `DEALER_ACTION_DELAY_MS` controls the pause before each dealer action.
- Toasts appear at least 900ms apart (`TOAST_GAP_MS`) and stay visible longer.
- A toast that is pushed out animates out, rather than unmounting abruptly.

### 7. Seat transitions (`df44131`)
- When control changes, the outgoing seat collapses into its rail slot (650ms). Then the incoming chip expands into the focus column (700ms, starting after the collapse).
- `components/useSeatFlip.ts` uses the Web Animations API. Slots are tagged `data-seat-key` and `data-seat-role`.
- Reduced-motion settings disable the motion.
- The seat's own slide-in animation was removed to avoid a clash.

### 8. Draw menu removed (`a85309f`)
- The player toolbar has Hit, Stay, Double Down, the wager button, and Deal.
- The `GameAction.Draw` reducer action stays, since Hit and the dealer use it.

### 9. Hit and Stay gated on a dealt hand (`8135b87`)
- Both are disabled until at least one hand has cards.

### 10. Activity log grouped by hand, with bank changes (`8c5d847`)
- Entries carry `round` (the hand number) and `amount` (signed change to that player's bank).
- The log has one section per hand, newest hand first. Each section's entries are sorted newest first by default.
- A Change column shows `+$X` or `-$X`. Gains are tinted green and decreases and losses red.
- Antes, wagers, and doubles are decreases. Winnings are increases. The dealer's 3:2 blackjack bonus is a decrease.
- Results are recorded once, when the round settles, in `evaluateGame.ts`. The duplicate result lines in the reducer were removed.
- Old saved entries have no `round`. They still group by `sessionId`.
- Files: `functions/activity.ts` (shared recorder), `functions/gameReducer.ts`, `functions/evaluateGame.ts`, `components/ActivityLog.tsx`, `App.css`, `types/GameState.ts`.

### 11. Splash screen replaced with a player identity system (`cf6faed`)
- The splash screen, the John and Ralph defaults, the unused `UserForm` stub, and the splash settings are removed.
- **Table:** before a game, shows the selected player and the Dealer as chips, with a **Start game** button.
- **Players dialog** (header button): create a named player (validated: non-empty, at most 20 characters, unique case-insensitive, "Dealer" reserved), choose who plays the next game, and see a statistics table for every player.
- **Profiles:** persisted under `StoreName.PROFILESTORE`. The state is `{ profiles, selectedId }`. Each profile has lifetime `stats`. The human profile's id is the player key in games. The Dealer profile has id `dealer`.
- **Stats flow:** `NewGame` takes `players` seats with the profile stats, so the game starts from the lifetime totals. When a round settles, `App.tsx` dispatches `syncStats` on the transition of `gameStatusFlag`, which copies the stats back. This is idempotent, so reloads do not double count.
- **Clear application data** also resets the profiles.
- Files: `functions/profiles.ts` (pure reducer, validation, seats, summaries), `functions/profiles.test.ts`, `context/ProfileContext.ts`, `components/PlayersDialog.tsx`, `components/AppHeader.tsx`, `components/Table.tsx`, `components/OptionsPanel.tsx`, `functions/persistence.ts` (`loadProfiles`, `saveProfiles`), `App.tsx`, `definitions.ts` (`STARTING_BANK`).

### Other
- `README.md` updated for the new table layout, notices, and the players feature.
- Tests added or updated across `App.test.tsx`, `ControlPanel.test.tsx`, `ActivityLog.test.tsx`, `gameReducer.test.ts`, `persistence.test.ts`, and `Agent.test.tsx`.

## Architecture quick reference

| Concern | Where |
|---|---|
| Game rules and state transitions | `functions/gameReducer.ts`, `functions/evaluateGame.ts` (settlement) |
| Activity recording | `functions/activity.ts` |
| Seat focus, rail, pre-game chips | `components/Table.tsx` |
| Seat flip animation | `components/useSeatFlip.ts` |
| Toast notices | `components/TableToasts.tsx`, `functions/announcements.ts` |
| Seat status labels | `functions/seatStatus.ts` |
| Player profiles and stats | `functions/profiles.ts`, `context/ProfileContext.ts`, `components/PlayersDialog.tsx` |
| Persistence | `functions/persistence.ts`. `GAME_STORE_VERSION` is still 2, since the saved game shape did not change. |

Focus rule: `pinnedKey ?? controllingPlayer ?? humanKey`. The rail shows every other seat.

Timings: `DEALER_ACTION_DELAY_MS` 1400, `COLLAPSE_MS` 650, `EXPAND_MS` 700, toast hold 1100, toast exit 260, `TOAST_GAP_MS` 900.

## Known limitations and open items

- **Wager is still enabled before the deal.** Only Hit and Stay are gated. This was left deliberately; confirm before changing it.
- **Bank resets to $1000 at each new game.** Only the stats persist across games.
- **No delete or rename for players** in the Players dialog.
- **"Pots won" is the gross pot**, not net profit.
- **"Pot" in the activity log means each player's bank**, which is an interpretation.
- **Round-end focus stays on the human seat**, so the Deal button is reachable. The dealer's final hand is one click away on its rail chip.
- **Hole card**: the dealer's first card stays hidden unless "Show Dealer Hand" is on, including in the rail.
- `.github/copilot-instructions.md` does not yet mention the profile store or the new persistence key.
- Browser checks were done in headless Chromium at 1440px and 390px. Real touch devices were not tested.

## Working notes for the next agent

- **Tests:** `setupTests.ts` clears `localStorage` after each test. jsdom has no `matchMedia` or `Element.animate`, so `useSeatFlip` guards for both.
- **Dev server checks:** do not combine starting the server and `pkill -f "vite --host ..."` in one shell command. The pattern matches its own shell and exits with 144. Start and stop the server in separate commands, using a pattern like `ps -eo pid,args | grep "[v]ite --host 127.0.0.1"`.
- **Playwright:** `getByRole` name matching is substring by default. Use `exact: true` for "Deal", "Stay", and "Start game".
- **Shell editing:** a shell command containing `${...}` template text was once blocked by the safety checker. Make edits with the file editing tools instead.
- **Pushing:** the remote branch can move while you work. Fetch, merge the remote branch, re-run checks, and then push. Do not force-push.
