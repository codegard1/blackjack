[![Netlify Status](https://api.netlify.com/api/v1/badges/a4a75fa0-06a5-4074-b22d-6797ea093864/deploy-status)](https://app.netlify.com/sites/codegard1-blackjack/deploys)

# Chris's Blackjack

### Introduction
This project is an attempt to build a game of blackjack from scratch, as a way to practice implementing some of the web technologies I've been using at work. 

### How to Play
1. Clone the repo 
2. `cd` into the repo directory
3. Run `npm install`
4. Run `npm start`
5. Navigate to `localhost:3000`

#### Technologies Used
* [React](https://facebook.github.io/react/)
* [Office UI Fabric](https://dev.office.com/fabric)@2.34
* [Masonry](https://masonry.desandro.com/) 
* [node-shuffle](https://github.com/codegard1/node-shuffle) (forked)

#### Project Status as of 10/27/2017
* The Dealer can now play for itself, allowing a single human player to compete against a simple algorithm
* Endgame conditions are now handled more or less as expected
* Game options are now sequestered in a panel  
* Extraneous UI elements have been hidden from the game table by default
* Player actions are displayed in callouts beneath each player deck
* Many small updates to the styles used in Player Containers 

#### Wish List
* Upgrade dependencies
* Use [CSS Card Tricks](https://designshack.net/articles/css/css-card-tricks/) to style cards (6/13/17)
* Use CSS transitions to flip / move cards (6/13/17)
* Convert entire project to TypeScript (9/6/2017) 
* Show recommended moves to teach the human player good strategy (9/6/2017)

