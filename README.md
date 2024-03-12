# Chris's Blackjack

### Introduction
This project is an attempt to build a game of blackjack from scratch, as a way to practice implementing some of the web technologies I've been using at work. 

![image](https://user-images.githubusercontent.com/5205131/112094450-a8884400-8b71-11eb-9853-0eaba33d5b23.png)

https://mango-cliff-08390e60f.azurestaticapps.net/

### How to Play
1. Clone the repo 
2. `cd` into the repo directory
3. Run `npm install`
4. Run `npm start`
5. Navigate to `localhost:3000`

#### Technologies Used
* [React](https://facebook.github.io/react/)
* Flux
* [Fluent UI](https://developer.microsoft.com/en-us/fluentui)
* [node-shuffle](https://github.com/codegard1/node-shuffle) (forked)

#### Project Status as of 10/27/2017
* The Dealer can now play for itself, allowing a single human player to compete against a simple algorithm
* Endgame conditions are now handled more or less as expected
* Game options are now sequestered in a panel  
* Extraneous UI elements have been hidden from the game table by default
* Player actions are displayed in callouts beneath each player deck
* Many small updates to the styles used in Player Containers 

#### Wish List
* Use [CSS Card Tricks](https://designshack.net/articles/css/css-card-tricks/) to style cards (6/13/17)
* Use CSS transitions to flip / move cards (6/13/17)
* Convert entire project to TypeScript (9/6/2017) 
* Show recommended moves to teach the human player good strategy (9/6/2017)
