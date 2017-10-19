import Player from "./Player";
import { DeckStore } from "./DeckStore";

class Players {
  constructor() {
    this.players = [];
    this.currentPlayerIndex = 0;
    this.currentPlayer = {
      bet: amount => this.currentPlayerBets(amount).bind(this),
      finish: this.currentPlayerFinishes.bind(this),
      hit: this.currentPlayerHits.bind(this),
      startTurn: this.currentPlayerStartsTurn.bind(this),
      stay: this.currentPlayerStays.bind(this)
    };
  }
  /* return all players */
  getPlayer(id) {
    const i = this.getIndex(id);
    return this.players[i];
  }
  getPlayers() {
    return this.players;
  }
  getCurrentPlayer() {
    const i = this.currentPlayerIndex;
    return this.players[i];
  }
  getIndex(id) {
    return this.players.findIndex(player => player.id === id);
  }
  /* return the Id of a player */
  getId(index) {
    return this.players[index].id;
  }

  /* add a new Player to the array */
  newPlayer(...props) {
    this.players.push(new Player(...props));
  }

  /* cycle currentPlayerIndex  */
  nextPlayer() {
    this.currentPlayerIndex =
      this.currentPlayerIndex + 1 >= this.length()
        ? 0
        : this.currentPlayerIndex + 1;
    this.currentPlayer.startTurn();
  }

  /* reset props on the specified player */
  resetPlayer(id, ...keys) {
    const i = this.getIndex(id);
    this.players[i].reset(...keys);
  }

  /* set players' status, hand values */
  evaluatePlayers() {
    this.players.forEach(player => {
      player.handValue = DeckStore.getHandValue(player.id);
      player.setStatus();
    });
  }

  finish(id) {
    this.players[this.getIndex(id)].finish();
  }

  stay(id) {
    this.players(this.getIndex(id)).stay();
  }

  currentPlayerStays() {
    const i = this.currentPlayerIndex;
    this.players[i].stay();
  }
  currentPlayerHits() {
    const i = this.currentPlayerIndex;
    this.players[i].hit();
  }
  currentPlayerStartsTurn() {
    const i = this.currentPlayerIndex;
    this.players[i].startTurn();
  }
  currentPlayerFinishes() {
    const i = this.currentPlayerIndex;
    this.players[i].finish();
  }
  currentPlayerBets(amount) {
    const i = this.currentPlayerIndex;
    this.players[i].bet(amount);
  }
  isCurrentPlayerNPC() {
    const i = this.currentPlayerIndex;
    // console.log(`this.players[${i}].isNPC === ${this.players[i].isNPC}`);
    return this.players[i].isNPC;
  }

  allPlayersAnte(amount) {
    this.players.forEach(player => {
      player.ante(amount);
    });
  }

  length() {
    return this.players.length;
  }

  startTurn(id) {
    this.players[this.getIndex(id)].turn = true;
    this.players[this.getIndex(id)].isFinished = false;
  }

  newRound() {
    /* reset all players' status props for new Round */
    this.players.forEach(player => player.resetStatus());
    this.currentPlayerIndex = 0;
  }

  newGame() {
    /* reset all players' props for new Game */
    this.players.forEach(player => player.resetAll());
    this.currentPlayerIndex = 0;
  }

  allPlayersFinish() {
    this.players.forEach(player => {
      player.finish();
    });
  }

  payout(index, amount) {
    this.players[index].bank += amount;
  }
}

export default Players;
