import * as D from '../definitions';

class Player {
  constructor(id, title) {
    this.id = id;
    this.title = title;
    this.hand = [];
    this.handValue = { aceAsOne: 0, aceAsEleven: 0 };
    this.status = "ok";
    this.turn = false;
    this.bank = 1000;
    this.bet = 0;
    this.lastAction = "none";
    this.isStaying = false;
  }
  remove(key) {
    const defaults = {
      id: "",
      title: "",
      hand: [],
      handValue: { aceAsOne: 0, aceAsEleven: 0 },
      status: "ok",
      turn: false,
      bank: 1000,
      bet: 0,
      lastAction: "none",
      isStaying: false
    };
    this[key] = defaults[key];
  }
  reset(key) {
    this.remove(key);
  }
  setStatus() {
    /*   set busted status  */
    if (this.handValue.aceAsOne > 21 && this.handValue.aceAsEleven > 21) {
      this.status = D.busted;
    }
    /*   set blackjack status  */
    if (
      this.handValue.aceAsOne === 21 || this.handValue.aceAsEleven === 21
    ) {
      this.status = D.blackjack;
    }
  }
  getHighestHandValue() {
    let higherHandValue = 0;

    if (this.handValue.aceAsEleven === this.handValue.aceAsOne) {
      return this.handValue.aceAsOne;
    } else {
      higherHandValue = this.handValue.aceAsOne > this.handValue.aceAsEleven
        ? this.handValue.aceAsOne
        : this.handValue.aceAsEleven;
      return higherHandValue;
    }
  }
  ante(amount) {
    this.bank -= amount;
  }
}

export default Player;
