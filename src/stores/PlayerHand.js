export class PlayerHand {
    constructor(playerId) {
        this.id = playerId;
        this.handValue = { aceAsOne: 0, aceAsEleven: 0 };
        this.hand = [];
    }
    evaluate() {
        if (this.hand.length > 0) {
            this.handValue = { aceAsOne: 0, aceAsEleven: 0 };
            this.hand.forEach(card => {
                switch (card.sort) {
                    case 14: /* Ace */
                        this.handValue.aceAsOne += 1;
                        this.handValue.aceAsEleven += 11;
                        break;

                    case 13: /* King */
                        this.handValue.aceAsOne += 10;
                        this.handValue.aceAsEleven += 10;
                        break;

                    case 12: /* Queen */
                        this.handValue.aceAsOne += 10;
                        this.handValue.aceAsEleven += 10;
                        break;

                    case 11: /* Jack */
                        this.handValue.aceAsOne += 10;
                        this.handValue.aceAsEleven += 10;
                        break;

                    default:
                        this.handValue.aceAsOne += card.sort;
                        this.handValue.aceAsEleven += card.sort;
                        break;
                }
            });
        }
        return this.handValue;
    }

    clear() {
        this.handValue = { aceAsOne: 0, aceAsEleven: 0 };
        this.hand = [];
    }
}

export default PlayerHand;
