---
description: "Use when changing blackjack rules, game reducers, deck or player state, round settlement, or localStorage persistence."
applyTo:
  - "src/game/**"
  - "src/sync/**"
  - "shared/**"
---
# Game Logic Instructions

- Keep rule decisions in the reducer and domain functions/classes; components should dispatch actions rather than implement game transitions.
- Preserve the current rules: the dealer draws below 17 and stands at 17 or higher; a natural is 21 with exactly two cards; simultaneous naturals push; pushes return each player's stake; a human natural receives a 3:2 bonus.
- Double down is available to any non-dealer seat (human or computer character) on its turn with exactly two cards when their bank can cover the current round stake. It adds that stake, draws one card, and stands unless the draw busts.
- Keep settlement idempotent through `gameStatusFlag`. Round stake includes the ante and any added wagers.
- `gameReducer` must leave the state it is given untouched. It plays each action on `clone()`s of the deck and the player store, and `applyAction` and the domain helpers change those copies in place. Anything new that state holds and an action changes in place needs copying too; the frozen-state test in `gameReducer.test.ts` and the strict mode test in `App.strict.test.tsx` catch a miss. An action made of other actions calls `applyAction`, not `gameReducer`.
- Do not read the clock or `Math.random` in the reducer or the helpers it calls. The time of an action is on `state.lastWriteTime` and random numbers come from `state.deck.random()`; both are taken from the action's `now` and `seed`, which `stampAction` adds where actions are dispatched. A reducer must not throw: return the state unchanged when an action cannot be carried out.
- When changing the persisted game snapshot or `GameStatus` values, update `GAME_STORE_VERSION` in `src/sync/persistence.ts` and cover restoration behavior with tests.
- Keep profile changes in `profileReducer` and profile helpers in `src/game/profiles.ts`. Profiles are persisted separately from the active game under `StoreName.PROFILESTORE`; `seatsFor` supplies the selected human, the chosen computer characters, and the dealer, each with their lifetime stats, to a new game. When a round settles, sync the game stats back to profiles only on the settlement transition so restored rounds are not counted twice.
- When changing profile persistence, profile-to-seat mapping, or stats synchronization, cover defaults, restoration/normalization, and cross-game accumulation with tests.
- When changing blackjack rules or available actions, update `src/ui/RulesDialog.tsx` and the README's Rules section to match the reducer/domain behavior, and add or update tests for the changed rule.
- For reducer and rule tests, use a known deck order rather than relying on random deals. Add explicit cases for outcomes, stakes, payouts, and state transitions affected by the change.
