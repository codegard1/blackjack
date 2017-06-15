# Chris's Blackjack

### Introduction
This project is an attempt to build a game of blackjack from scratch, as a way to practice implementing some of the web technologies I've been using at work. 

The game was originally meant to be Texas Hold 'Em (hence the repo name), but I changed my mind early on. Eventually, I do want to build out a poker game, maybe even as an extension of this project. but for now it's blackjack. 

#### Technologies Used
* [React](https://facebook.github.io/react/)
* [Office UI Fabric](https://dev.office.com/fabric)@2.34
* [Masonry](https://masonry.desandro.com/) 
* [node-shuffle](https://github.com/codegard1/node-shuffle) (forked)

#### Project Status as of 6/8/17
* Visual logic is basically done, but will improve over time
* App state has *deck* and *drawn* arrays. Next up: players' hands
* All control panel buttons work as expected
* Selecting / deselecting cards works as expected
* Game correctly calculates the value of each hand
* The Masonry component does not render with the correct width when embedded inside an ms-Grid 

#### Wish List
* Use [CSS Card Tricks](https://designshack.net/articles/css/css-card-tricks/) to style cards (6/13/17)
* Use CSS transitions to flip / move cards (6/13/17)
* Implement JSDoc across the board (6/13/17)
* Convert the node-shuffle module to React components (6/13/17)

## Reasoning
#### **Turns**
* Initially, turn is _undefined_
* When gameStatus === 1 (i.e. New Game) => new Turn
  * Turn touches the following:
  >- currentPlayer (from state)
  >- turncount 
  >    - () => turncount += 1
  >- gameStatus (from state)

* Pressing the _Deal_ button on the CommandBar initializes turn in state
  *     if(!turn){ 
          () => currentPlayer
          const turn = {
              currentPlayer, // who is currentPlayer initially?
              gameStatus: 1, // New Game
              turncount: 0
          }
          this.setState({ turn });
        } 
After setting the initial state, do:
* evaluate each player's hand value(s)
  * if a game-ending condition obtains, handle it with *win(player)* and set gameStatus to 3 (Game Over)
* set currentPlayer.turn => _true_
* when currentPlayer.turn is _true_, buttons on the CommandBar associated with that player become available: _Hit_, _Stay_, etc. 
* each time the player uses a button, evaluate game status again to check for a game-ending condition, and handle appropriately:
  - bust out => gameStatus = 3; display losing message 
  - blackjack => gamestatus = 4; display winning message
  - tie => gameStatus = 5; identify a winner and display appropriate message
  - stay => gameStatus = 6; turn passes to the next player in the players array 


**Game Status Enum**
          
      0 : Off 
      1 : New Game 
      3 : Game Over (Busted!)
      4 : Game Over (Blackjack!)
      5 : Tie (dealer wins?)
      6 : Stay (turn ends) 
