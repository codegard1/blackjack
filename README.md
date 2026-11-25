# Chris's Blackjack

### Introduction
This project is an attempt to build a game of blackjack from scratch, as a way to practice implementing some of the web technologies I've been using at work.

![image](https://user-images.githubusercontent.com/5205131/112094450-a8884400-8b71-11eb-9853-0eaba33d5b23.png)

### How to Play
1. Clone the repo
2. `cd` into the repo directory
3. Use Node.js 26 (the version in `.nvmrc`); 24.15+ also works
4. Run `npm install`
5. Optionally copy `.env.example` to `.env` and fill in the MongoDB values (see [Cloud sync](docs/cloud-sync.md)); without them the game runs from browser storage alone
6. Run `npm start`
7. Navigate to `http://localhost:3000`

Run `npm test` for the test suite (`npm run test:coverage` also measures coverage, writes a report to `coverage/`, and fails below the thresholds in `vite.config.ts`), `npm run typecheck` for TypeScript checks, `npm run lint` for ESLint, and `npm run build` to create the static site in `dist/`. GitHub Actions runs all four on every pull request and push to `master`, along with `npm audit` for the packages that ship. Dependabot proposes dependency updates weekly.

#### Technologies Used
* [React](https://react.dev/) 19
* TypeScript
* [Vite](https://vite.dev/) and [Vitest](https://vitest.dev/)
* [Fluent UI](https://react.fluentui.dev/) v9
* [Netlify Functions](https://docs.netlify.com/build/functions/overview/) and [MongoDB Atlas](https://www.mongodb.com/atlas) for cloud sync of player profiles
* Deck logic adapted from [node-shuffle](https://github.com/codegard1/node-shuffle) (forked)

#### Rules
* Play against a dealer (hits below 17 by default; configurable for soft 17) with up to four computer players.
* Options control deck count (1, 2, 6, or 8), dealer soft 17 behavior, blackjack payout (3:2 or 6:5), resplitting, doubling after a split, insurance, and late surrender; changes apply on the next hand.
* Each round starts with a minimum ante, with optional increments before dealing or during your turn. Play proceeds from you, to computer players, to the dealer.
* Natural 21s pay at the selected rate; Double Down and Split are available when your bank can cover the stake.
* Open **Blackjack rules** from the book icon in the header for the full in-app guide.

#### Documentation
* [Characters](docs/characters.md) — computer player personalities, Le Guin-inspired jobs, pixel-art portraits, and history simulation
* [Table Behavior and Features](docs/table-behavior.md) — PWA/offline support, strategy hints, appearance settings, layout, pot, and notifications
* [Cloud Sync](docs/cloud-sync.md) — MongoDB Atlas, Netlify Functions, Google Sign-In, and local/Atlas setup

#### Wish List
* Flip newly dealt cards as they land
