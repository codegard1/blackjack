export class PlayerHand {
    constructor(playerId) {
        return {
            id: playerId,
            handValue: { aceAsOne: 0, aceAsEleven: 0 },
            hand: []
        };
    }
}

export default PlayerHand;
