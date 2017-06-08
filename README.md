## Chris's Blackjack

#### Introduction
This project is an attempt to build a game of blackjack from scratch, as a way to practice implementing some of the web technologies I've been using at work. 

The game was originally meant to be Texas Hold 'Em (hence the repo name), but I changed my mind early on. Eventually, I do want to build out a poker game, maybe even as an extension of this project. but for now it's blackjack. 

#### Technologies Used
* [React](https://facebook.github.io/react/)
* [Office UI Fabric](https://dev.office.com/fabric)
* [Masonry](https://masonry.desandro.com/) 
* [node-shuffle](https://github.com/codegard1/node-shuffle)

#### Project Status as of 6/8/17
* Visual logic is basically done, but will improve over time
* App state has *deck* and *drawn* arrays. Next up: players' hands
* All control panel buttons work as expected
* Selecting / deselecting cards works as expected
* Game correctly calculates the value of each hand
* The Masonry component does not render with the correct width when embedded inside an ms-Grid 
