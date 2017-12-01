/*  adapted from node-shuffle 
    https://github.com/codegard1/node-shuffle.git */

class PlayingCard {
    constructor(suit, description, sort) {
        this.suit = suit;
        this.description = description;
        this.sort = sort;
    }
    toString() {
        return this.description + " of " + this.suit + "s";
    }
    toShortDisplayString() {
        var suit = this.suit.substring(0, 1);
        var value;
        switch (this.sort) {
            case 11:
                value = "J";
                break;
            case 12:
                value = "Q";
                break;
            case 13:
                value = "K";
                break;
            case 14:
                value = "A";
                break;
            default:
                value = this.sort;
        }
        return value + suit;
    }
}

export default PlayingCard;
