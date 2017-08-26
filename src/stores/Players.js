import { Player } from './Player';
import { DeckStore } from './DeckStore';
import * as D from '../definitions';

class Players {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.stayingPlayers = [];
        this.bustedPlayers = [];
        this.nonBustedPlayers = [];
        this.allPlayersStaying = false;
        this.allPlayersBusted = false;
        this.allPlayersNonBusted = true;
        this.highestHandValue = 0;
        this.winningPlayerId = -1;
        this.winningPlayerIndex = -1;
        this.tieFlag = false;
    }
    /* add a new Player to the array */
    newPlayer(id, title) {
        this.players.push(new Player(id, title));
    }
    currentPlayer() {
        return this.players[this.currentPlayerIndex];
    }
    /* cycle the currentPlayerIndex  */
    nextPlayer() {
        this.currentPlayerIndex = this.currentPlayerIndex + 1 >= this.players.length
            ? 0
            : this.currentPlayerIndex + 1;
        this.players.forEach((player, index) => {
            player.turn = index === this.currentPlayerIndex
        });
        return this.players[this.currentPlayerIndex];
    }
    /* reset props on the specified player */
    resetPlayer(id, ...keys) {
        this.players[this.getIndex(id)].reset(...keys);
    }
    /* set players' status, hand values */
    evaluatePlayers() {
        if (this.players.length > 0) {
            /* 1. Get handValues for each player */
            this.evaluatePlayerHands();
            /* 2. Sort players into arrays based on status flags  */
            this.filterPlayers();
            /* 3. Check for a tie */
            for (let i = 1; i < this.nonBustedPlayers.length; i++) {
                if (this.nonBustedPlayers[i].getHigherHandValue() === this.nonBustedPlayers[0].getHigherHandValue()) {
                    this.tieFlag = true;
                } else {
                    this.tieFlag = false;
                }
            }
            /* 4. determine which player is in the lead */
            let winningHandValue = 0;
            let playerId;
            /* cycle through non-busted players' hand values and end up with the highest value one */
            if (!this.tieFlag) {
                this.nonBustedPlayers.forEach(player => {
                    let handValue = player.getHigherHandValue();
                    if (handValue > winningHandValue && handValue <= 21) {
                        winningHandValue = handValue;
                        playerId = player.id;
                    }
                });
                this.highestHandValue = winningHandValue;
                this.setWinner(playerId);
            } else {
                this.winningHandValue = this.nonBustedPlayers[0].getHigherHandValue();
            }
        }
    }
    /* evaluate each player's hand (in deckStore) and set status flags */
    evaluatePlayerHands() {
        this.players.forEach(player => {
            player.handValue = DeckStore.getHandValue(player.id);
            player.getHigherHandValue();
            player.setStatus();
        });
    }
    /* filter players by status */
    filterPlayers() {
        const length = this.players.length;
        /*   STAYING PLAYERS  */
        this.stayingPlayers = this.players.filter(player => player.isStaying);
        /*   BUSTED PLAYERS   */
        this.bustedPlayers = this.players.filter(player => player.isBusted);
        /*   NON-BUSTED PLAYERS  */
        this.nonBustedPlayers = this.players.filter(player => !player.isBusted);
        /*   BLACKJACK PLAYERS   */
        this.blackjackPlayers = this.players.filter(player => player.hasBlackJack);
        /*   FINISHED PLAYERS   */
        this.finishedPlayers = this.players.filter(player => player.isFinished);
        /*   true if all players are staying  */
        this.allPlayersStaying = this.stayingPlayers.length === length;
        /*   true if all players are busted  */
        this.allPlayersBusted = this.bustedPlayers.length === length;
        /*   true if all players are not busted  */
        this.allPlayersNonBusted = this.nonBustedPlayers.length === length;
        /*   true if all players are finished */
        this.allPlayersFinished = this.finishedPlayers.length === length;
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
    /* return an array of Players that have Blackjack */
    getBlackjackPlayers() {
        this.filterPlayers();
        return this.blackjackPlayers;
    }
    getIndex(id) {
        return this.players.findIndex(player => player.id === id);
    }
    /* return the Id of a player */
    getId(index) {
        return this.players[index].id;
    }
    finish(id) {
        this.players[this.getIndex(id)].finish();
    }
    stay(id) {
        this.players(this.getIndex(id)).stay();
    }
    currentPlayerStays() {
        this.players[this.currentPlayer].stay();
    }
    blackjack(id) {
        this.players(this.getIndex(id)).blackjack();
    }
    all(methodName) {
        switch (methodName) {
            case 'finish':
                this.players.forEach(player => player.finish());
                break;
            case 'stay':
                this.players.forEach(player => player.stay());
                break;
            case 'ante':
                this.players.forEach(player => player.ante());
                break;
            default:
                break;
        }
    }
    setWinner(id) {
        const index = this.getIndex(id);
        this.players[index].status = D.winner;
        this.winningPlayerIndex = index;
        this.winningPlayerId = id;
    }
    isTie() {
        return this.tieFlag;
    }
    length() {
        return this.players.length;
    }
    find(id) {
        return this.players[this.getIndex(id)]
    }
    startTurn(id) {
        this.players[this.getIndex(id)].turn = true;
        this.players[this.getIndex(id)].isFinished = false;
    }
}

export default Players;

