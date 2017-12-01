/*  adapted from node-shuffle 
    https://github.com/codegard1/node-shuffle.git */

import Deck from "./Deck";
import PlayingCardDeck from "./PlayingCardDeck";

class Shuffle {
    constructor() {
        return this.shuffle();
    }
    playingCards() {
        return new PlayingCardDeck().cards;
    }
    shuffle(options) {
        const defaultOptions = {
            deck: new PlayingCardDeck().cards,
            numberOfDecks: 1,
            random: function () {
                return Math.random();
            }
        };

        if (!options) options = defaultOptions;

        if (!options.deck) {
            options.deck = defaultOptions.deck;
        }

        if (options.numberOfDecks) {
            var oneDeck = options.deck;
            for (var i = 0; i < options.numberOfDecks - 1; i++) {
                options.deck = options.deck.concat(oneDeck);
            }
        }

        if (!options.random) {
            options.random = defaultOptions.random;
        }

        return new Deck(options.deck, options.random);
    }
}

export default Shuffle;
