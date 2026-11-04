# Chris's Blackjack

### Introduction
This project is an attempt to build a game of blackjack from scratch, as a way to practice implementing some of the web technologies I've been using at work. 

![image](https://user-images.githubusercontent.com/5205131/112094450-a8884400-8b71-11eb-9853-0eaba33d5b23.png)

https://mango-cliff-08390e60f.azurestaticapps.net/

### How to Play
1. Clone the repo 
2. `cd` into the repo directory
3. Use Node.js 22.22+ (version in `.nvmrc`), 24.15+, or 26+
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
* One human player against a dealer that hits below 17 and stands otherwise
* Each round starts with an ante from every player; the human can add wagers
* Natural blackjacks are settled right after the deal; a human natural pays a 3:2 bonus on the stake
* Equal totals push and return each player's stake
* Double down on any two-card hand: match your stake, take one card, then stand

#### Project Status
* Game state and settings are saved in the browser, so a reload resumes the current game
* The activity log records each deal, draw, wager, stay, and result
* Cards are styled with CSS and animate onto the table

#### Wish List
* Split pairs (requires multiple hands per player)
* Show recommended moves to teach the human player good strategy
* Use CSS transitions to flip cards
