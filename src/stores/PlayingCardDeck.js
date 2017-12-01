/*  adapted from node-shuffle 
    https://github.com/codegard1/node-shuffle.git */

import PlayingCard from "./PlayingCard";

class PlayingCardDeck {
    constructor() {
        this.cards = [
            new PlayingCard("Club", "Two", 2),
            new PlayingCard("Club", "Three", 3),
            new PlayingCard("Club", "Four", 4),
            new PlayingCard("Club", "Five", 5),
            new PlayingCard("Club", "Six", 6),
            new PlayingCard("Club", "Seven", 7),
            new PlayingCard("Club", "Eight", 8),
            new PlayingCard("Club", "Nine", 9),
            new PlayingCard("Club", "Ten", 10),
            new PlayingCard("Club", "Jack", 11),
            new PlayingCard("Club", "Queen", 12),
            new PlayingCard("Club", "King", 13),
            new PlayingCard("Club", "Ace", 14),
            new PlayingCard("Diamond", "Two", 2),
            new PlayingCard("Diamond", "Three", 3),
            new PlayingCard("Diamond", "Four", 4),
            new PlayingCard("Diamond", "Five", 5),
            new PlayingCard("Diamond", "Six", 6),
            new PlayingCard("Diamond", "Seven", 7),
            new PlayingCard("Diamond", "Eight", 8),
            new PlayingCard("Diamond", "Nine", 9),
            new PlayingCard("Diamond", "Ten", 10),
            new PlayingCard("Diamond", "Jack", 11),
            new PlayingCard("Diamond", "Queen", 12),
            new PlayingCard("Diamond", "King", 13),
            new PlayingCard("Diamond", "Ace", 14),
            new PlayingCard("Heart", "Two", 2),
            new PlayingCard("Heart", "Three", 3),
            new PlayingCard("Heart", "Four", 4),
            new PlayingCard("Heart", "Five", 5),
            new PlayingCard("Heart", "Six", 6),
            new PlayingCard("Heart", "Seven", 7),
            new PlayingCard("Heart", "Eight", 8),
            new PlayingCard("Heart", "Nine", 9),
            new PlayingCard("Heart", "Ten", 10),
            new PlayingCard("Heart", "Jack", 11),
            new PlayingCard("Heart", "Queen", 12),
            new PlayingCard("Heart", "King", 13),
            new PlayingCard("Heart", "Ace", 14),
            new PlayingCard("Spade", "Two", 2),
            new PlayingCard("Spade", "Three", 3),
            new PlayingCard("Spade", "Four", 4),
            new PlayingCard("Spade", "Five", 5),
            new PlayingCard("Spade", "Six", 6),
            new PlayingCard("Spade", "Seven", 7),
            new PlayingCard("Spade", "Eight", 8),
            new PlayingCard("Spade", "Nine", 9),
            new PlayingCard("Spade", "Ten", 10),
            new PlayingCard("Spade", "Jack", 11),
            new PlayingCard("Spade", "Queen", 12),
            new PlayingCard("Spade", "King", 13),
            new PlayingCard("Spade", "Ace", 14)
        ];
    }
}

export default PlayingCardDeck;
