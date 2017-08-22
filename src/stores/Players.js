import { Player } from './Player';
import { DeckStore } from './DeckStore';
import * as D from '../definitions';

export class Players {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = -1;
        this.stayingPlayers = [];
        this.bustedPlayers = [];
        this.nonBustedPlayers = [];
        this.allPlayersStaying = false;
        this.allPlayersBusted = false;
        this.allPlayersNonBusted = true;
        this.highestHandValue = 0;
        this.winningPlayerId = -1;
        this.winningPlayerIndex = -1;
    }
    /* add a new Player to the array */
    newPlayer(id, title) {
        this.players.push(new Player(id, title));
    }
    /* cycle the currentPlayerIndex  */
    nextPlayer() {
        this.currentPlayerIndex = this.currentPlayerIndex + 1 === this.players.length
            ? 0
            : this.currentPlayerIndex + 1;
        this.players.forEach((player, index) => {
            player.turn = index === this.currentPlayerIndex ? true : false;
        });
    }
    /* reset props on the specified player */
    resetPlayer(id, ...keys) {
        const index = this.players.indexOf(this.players.find(player => player.id === id));
        this.players[index].reset(...keys);
    }
    /* set players' status, hand values */
    evaluatePlayers() {
        /*   evaluate hands  */
        if (this.players.length > 0) {
            this.players.forEach(player => {
                player.handValue = DeckStore.getHandValue(player.id);
                player.getHighestHandValue();
                player.setStatus();
            });

            this.setWinningPlayer();
        }
    }
    /* filter players by status */
    filterPlayers() {
        /*   SET STAYING PLAYERS  */
        this.stayingPlayers = this.players.filter(player => player.isStaying === true);

        /*   SET BUSTED PLAYERS   */
        this.bustedPlayers = this.players.filter(player => player.status === D.busted);

        /*   SET NON-BUSTED PLAYERS  */
        this.nonBustedPlayers = this.players.filter(player => player.status !== D.busted);

        /*   true if all players are staying  */
        this.allPlayersStaying = this.stayingPlayers.length === this.players.length;

        /*   true if all players are busted  */
        this.allPlayersBusted = this.bustedPlayers.length === this.players.length;

        /*   true if all players are not busted  */
        this.allPlayersNonBusted = this.nonBustedPlayers.length === this.players.length;
    }
    /* set winningPlayerId & winningPlayerIndex */
    setWinningPlayer() {
        /*   determine the non-busted player with the highest value hand  */
        if (this.nonBustedPlayers.length === 1) {
            this.nonBustedPlayers[0].status = D.winner;
        } else {
            this.nonBustedPlayers.forEach((player, index) => {
                let higherHandValue = player.getHighestHandValue();
                if (higherHandValue > this.highestHandValue && higherHandValue <= 21) {
                    this.highestHandValue = higherHandValue;
                    this.winningPlayerId = player.id;
                    this.winningPlayerIndex = index;
                }
            });
        }
    }
    /* return the winning Player object */
    getWinningPlayer() {
        return this.players[this.winningPlayerIndex];
    }
    /* return an array of busted players */
    getBustedPlayers() {
        this.filterPlayers();
        return this.bustedPlayers;
    }
    /* return an array of busted Players */
    getStayingPlayers() {
        this.filterPlayers();
        return this.stayingPlayers;
    }
}

export default Players;
