import GameStore from './GameStore';
import AppActions from '../actions/AppActions';

class Agent {
    constructor(playerId) {
        this.player = GameStore.getPlayer(playerId);

        setTimeout(this.resolve, this.interval);
    }
    resolve(player) {
        const
            aceAsEleven = player.handValue.aceAsEleven,
            aceAsOne = player.handValue.aceAsOne,
            handValue = player.handValue,
            hasBlackjack = player.hasBlackjack,
            isBusted = player.isBusted;

        /* when to hit */
        if (aceAsEleven <= 16 || aceAsOne <= 16) {
            AppActions.hit();
            console.log('Agent hit');
        }

        /* when to stay */
        if ((aceAsOne >= 17 && aceAsOne <= 21) || (aceAsEleven >= 17 && aceAsEleven <= 21)) {
            AppActions.stay();
            console.log('Agent stayed');
        }


    }
}

export default Agent;
