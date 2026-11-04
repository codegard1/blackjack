---
description: "Use when changing blackjack rules, game reducers, deck or player state, round settlement, or localStorage persistence."
applyTo:
  - "src/functions/**"
  - "src/classes/**"
  - "src/enums/**"
  - "src/interfaces/**"
  - "src/types/**"
---
# Game Logic Instructions

- Keep rule decisions in the reducer and domain functions/classes; components should dispatch actions rather than implement game transitions.
- Preserve the current rules: the dealer draws below 17 and stands at 17 or higher; a natural is 21 with exactly two cards; simultaneous naturals push; pushes return each player's stake; a human natural receives a 3:2 bonus.
- Double down is available to the human on their turn with exactly two cards when their bank can cover the current round stake. It adds that stake, draws one card, and stands unless the draw busts.
- Keep settlement idempotent through `gameStatusFlag`. Round stake includes the ante and any added wagers.
- `gameReducer` creates a new outer state while its deck and player store are class instances. A shallow spread does not clone those nested instances; account for this when changing state updates.
- When changing the persisted game snapshot or `GameStatus` values, update `GAME_STORE_VERSION` in `src/functions/persistence.ts` and cover restoration behavior with tests.
- For reducer and rule tests, use a known deck order rather than relying on random deals. Add explicit cases for outcomes, stakes, payouts, and state transitions affected by the change.
