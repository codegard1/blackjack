# Chris's Blackjack

### Introduction
This project is an attempt to build a game of blackjack from scratch, as a way to practice implementing some of the web technologies I've been using at work. 

![image](https://user-images.githubusercontent.com/5205131/112094450-a8884400-8b71-11eb-9853-0eaba33d5b23.png)

https://mango-cliff-08390e60f.azurestaticapps.net/

### How to Play
1. Clone the repo 
2. `cd` into the repo directory
3. Use Node.js 24.15+ (version in `.nvmrc`) or 26+
4. Run `npm install --legacy-peer-deps`
5. Run `npm start`
6. Navigate to `http://localhost:3000`

Run `npm test` for the test suite, `npm run typecheck` for TypeScript checks, and `npm run build` to create the static site in `dist/`.

#### Technologies Used
* [React](https://react.dev/) 19
* TypeScript
* [Vite](https://vite.dev/) and [Vitest](https://vitest.dev/)
* [Fluent UI](https://react.fluentui.dev/) v9
* Deck logic adapted from [node-shuffle](https://github.com/codegard1/node-shuffle) (forked)

#### Rules
* You and up to four computer players each play against a dealer that hits below 17 and stands otherwise
* Number cards count as shown, face cards count as 10, and aces count as 1 or 11
* Each round starts with a minimum ante from every player (the dealer does not ante); you can add minimum-bet increments before dealing or during your turn
* You play first, then each computer player, then the dealer; a bust loses that hand without ending the round
* Each hand is compared with the dealer's: the higher total wins even money from the dealer's bank, and equal totals push
* A natural blackjack is 21 with two cards and pays 3:2. A dealer natural ends the round at once; player naturals push and every other hand loses
* Double Down is available with exactly two cards if the bank can match the current stake; it adds that amount, draws one card, and stands unless the player busts
* Open Blackjack rules from the book icon in the header for the in-app guide

#### Characters
* Choose up to four computer players in the Players dialog: Ogion (The Rock), Shevek (The Shark), Haber (The Maniac) and Genly Ai (The Tourist). Faxe (The House) deals
* Each character has a pixel-art portrait, a tagline, a backstory card, and four stats (nerve, aggression, discipline, tilt) that drive how they hit, double down and bet; tilt makes them bet bigger and take more risks during a losing streak
* Portraits are built from text pixel maps in `scripts/build-portraits.mjs`; run `npm run portraits` after editing one
* Character names are borrowed, with admiration, from the novels of Ursula K. Le Guin; the characters themselves are new

#### Project Status
* Game state and settings are saved in the browser, so a reload resumes the current game
* Players: create named players from the Players dialog and choose who plays the next game. Each player's lifetime statistics (rounds, wins, losses, pushes, blackjacks, busts, winnings) are kept in the browser and shown in the same dialog
* The activity log records each deal, draw, wager, stay, and result
* Appearance settings in the Options panel: a light, dark, system or high contrast theme; five accent colors that recolor the Fluent UI theme and the table felt; three card face layouts (classic, minimal, bold); and a card back chosen from five patterns and five colors with a live preview. A Reset appearance button restores the defaults
* Cards are styled with CSS from the Fluent UI theme tokens, so they follow the chosen theme, and animate onto the table
* Seats collapse into name-and-bank chips until a round is dealt; the seat in control takes the right two thirds of the table (full width on phones), and its cards scale to fill their container
* The pot floats beside the pre-game seats and stays fixed in the table's top-left corner during play (bottom-left on narrow screens), including after a hand ends. Between hands it slides up out of view and the new pot slides in from the top. When money is added to it, it shimmers and bounces. Play waits for these animations to finish
* Turn changes, hits, stands, busts, blackjacks, and results appear as brief toast notices over the table

#### Wish List
* Split pairs (requires multiple hands per player)
* Show recommended moves to teach the human player good strategy
* Use CSS transitions to flip cards
