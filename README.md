# Chris's Blackjack

### Introduction
This project is an attempt to build a game of blackjack from scratch, as a way to practice implementing some of the web technologies I've been using at work. 

![image](https://user-images.githubusercontent.com/5205131/112094450-a8884400-8b71-11eb-9853-0eaba33d5b23.png)

https://mango-cliff-08390e60f.azurestaticapps.net/

### How to Play
1. Clone the repo 
2. `cd` into the repo directory
3. Use Node.js 26 (the version in `.nvmrc`); 24.15+ also works
4. Run `npm install`
5. Optionally copy `.env.example` to `.env` and fill in the MongoDB values (see Cloud sync below); without them the game runs from browser storage alone
6. Run `npm start`
7. Navigate to `http://localhost:3000`

Run `npm test` for the test suite, `npm run typecheck` for TypeScript checks, `npm run lint` for ESLint, and `npm run build` to create the static site in `dist/`. GitHub Actions runs all four on every pull request and push to `master`.

#### Technologies Used
* [React](https://react.dev/) 19
* TypeScript
* [Vite](https://vite.dev/) and [Vitest](https://vitest.dev/)
* [Fluent UI](https://react.fluentui.dev/) v9
* [Netlify Functions](https://docs.netlify.com/build/functions/overview/) and [MongoDB Atlas](https://www.mongodb.com/atlas) for cloud sync of player profiles
* Deck logic adapted from [node-shuffle](https://github.com/codegard1/node-shuffle) (forked)

#### Rules
* You and up to four computer players each play against a dealer that hits below 17 and stands otherwise
* Number cards count as shown, face cards count as 10, and aces count as 1 or 11
* Each round starts with a minimum ante from every player (the dealer does not ante); you can add minimum-bet increments before dealing or during your turn
* You play first, then each computer player, then the dealer; a bust loses that hand without ending the round
* Each hand is compared with the dealer's: the higher total wins even money from the dealer's bank, and equal totals push
* A natural blackjack is 21 with two cards and pays 3:2. A dealer natural ends the round at once; player naturals push and every other hand loses
* Double Down is available with exactly two cards if the bank can match the current stake; it adds that amount, draws one card, and stands unless the player busts
* Split is available on an exact same-rank pair if the bank can match the current stake; tens, jacks, queens and kings are different ranks. One split is allowed: each hand gets one card, plays in turn and settles separately. Split aces get one card each and stand, 21 on a split hand is not a natural, and Double Down is not allowed after a split
* Open Blackjack rules from the book icon in the header for the in-app guide

#### Characters
* Choose up to four computer players in the Players dialog: Ogion (The Rock), Shevek (The Shark), Haber (The Maniac) and Genly Ai (The Tourist). Faxe (The House) deals
* Each character has a pixel-art portrait, a tagline, a backstory card, and four stats (nerve, aggression, discipline, tilt) that drive how they hit, double down and bet; tilt makes them bet bigger and take more risks during a losing streak
* Portraits are built from text pixel maps in `scripts/build-portraits.mjs`; run `npm run portraits` after editing one
* Each character's record starts with a long play history from `src/data/characterHistory.json`, added to whatever they play at your table. `npm run simulate-history` regenerates it by playing real games between the characters in quick succession (10,000 rounds in under a second; options: `-- --rounds 20000 --seed 7 --out path`). The same seed gives the same history
* Character names are borrowed, with admiration, from the novels of Ursula K. Le Guin; the characters themselves are new

#### Project Status
* Install the app from your browser's install menu (or Add to Home Screen on iOS). After the first online visit finishes caching, the game loads and plays offline, including character portraits; cloud sync still needs a connection. Production builds served over HTTPS (or localhost) enable this; `npm start` does not. New versions activate and reload open tabs automatically, preserving the game saved in browser storage; updates are checked on page loads, hourly while open, and when the connection returns
* Game state and settings are saved in the browser, so a reload resumes the current game
* Players: create named players from the Players dialog and choose who plays. Roster changes (the human player and the computer players) never affect a hand in play; between hands the table updates at once, and a change made during a hand is seated when the next hand is dealt. Each player's lifetime statistics (hands, wins, losses, pushes, blackjacks, busts, and net result: the bank change across every hand, shown as +$ or −$) are kept in the browser and shown in the same dialog
* The activity log records each deal, draw, wager, stay, and result. It is a drawer that extends from the bottom edge of the table, opened and closed with the icon button in the table's bottom right corner; the Options panel's Open Activity Log by default switch decides whether it starts open. A new entry slides down into the log once the toast announcing it has faded out
* Appearance settings in the Options panel: a light, dark, system or high contrast theme; five accent colors that recolor the Fluent UI theme and the table felt; three card face layouts (classic, minimal, bold); and a card back chosen from five patterns and five colors with a live preview. A Reset appearance button restores the defaults
* Cards are styled with CSS from the Fluent UI theme tokens, so they follow the chosen theme, and animate onto the table
* The table fills the window below the header, with the same margin above it and on its left, right and bottom edges
* Seats collapse into name-and-bank chips until a round is dealt; the seat in control takes the right two thirds of the table (full width on phones), and its cards scale to fill their container
* The pot floats beside the pre-game seats and stays fixed in the table's top-left corner during play (bottom-left on narrow screens), including after a hand ends. Between hands it slides up out of view and the new pot slides in from the top. When money is added to it, it shimmers and bounces. Play waits for these animations to finish
* Turn changes, hits, stands, busts, blackjacks, results, and pot contributions appear as toast notices over the table. Each gets the same time on screen; new notices stack on the last one in the same spot while it fades out

#### Cloud sync
* Player profiles and their lifetime statistics, and the game in progress, are also saved to a MongoDB Atlas database through Netlify Functions, so they outlive the browser's storage and a game resumes where it was left off. The browser copy stays as a cache: the game works unchanged offline or when the database is unreachable, and the next change is sent once the connection is back
* There are no accounts yet. Each browser asks the server for an owner id once (`POST /api/owner`) and keeps it in local storage; the server stores that browser's profiles and game under it. The id is signed with a secret only the server holds, so a client cannot invent ids, and it carries a kind prefix (`browser:`) so a signed-in identity can use the same records later. Documents not written for 90 days expire on their own
* The functions live in `netlify/functions`: `/api/profiles/:ownerId` reads (GET) and replaces (PUT) one owner's profiles, `/api/game/:ownerId` does the same for the game in progress (sending the newest 200 activity log entries), `/api/owner` issues owner ids, and `/api/health` reports whether the database answers. All are rate limited by IP address, bodies are capped (16 KB for profiles, 64 KB for a game), and only the fields the game defines are stored. The shared client in `netlify/lib/mongo.ts` is created once per function instance and reused, as MongoDB recommends for serverless functions
* Credentials are never in the repository. The functions read `MONGODB_URI` (the Atlas connection string, marked as a secret), `MONGODB_DB`, and `OWNER_ID_SECRET` (a random string of 32 or more characters that signs owner ids, also marked as a secret) from environment variables set in the Netlify UI under Site configuration, Environment variables. For local development copy `.env.example` to `.env` (ignored by git) and fill in the values; `npm start` loads them, and `@netlify/vite-plugin` runs the functions inside the Vite dev server at `http://localhost:3000/api/...`
* Atlas setup: a database user with the `readWrite` role on the `blackjack` database only, and a Network Access entry for `0.0.0.0/0`, because Netlify functions have no fixed outbound addresses. The first writes create the `profiles` and `games` collections

#### Wish List
* Show recommended moves to teach the human player good strategy
* Use CSS transitions to flip cards
