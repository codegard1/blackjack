import * as D from '../definitions';

export class Player {
  constructor(id, title) {
    this.id = id;
    this.title = title;
    // this.hand = [];
    this.handValue = { aceAsOne: 0, aceAsEleven: 0 };
    this.status = "ok";
    this.turn = false;
    this.bank = 1000;
    this.bet = 0;
    this.lastAction = "none";
    this.isStaying = false;
    this.isBusted = false;
    this.isFinished = false;
  }
  remove(...keys) {
    const defaults = {
      id: "",
      title: "",
      // hand: [],
      handValue: { aceAsOne: 0, aceAsEleven: 0 },
      status: "ok",
      turn: false,
      bank: 1000,
      bet: 0,
      lastAction: "none",
      isStaying: false,
      isBusted: false,
      isFinished: false
    };
    keys.forEach(key => { this[key] = defaults[key]; });
  }
  resetStatus() {
    /* AKA NewRound; resets properties that are bound to a single round of play */
    this.remove(['status',
      'turn',
      'bet',
      'lastAction',
      'isStaying',
      'isBusted',
      'isFinished']);
  }
  resetAll() {
    this.remove(['handValue',
      'status',
      'turn',
      'bank',
      'bet',
      'lastAction',
      'isStaying'])
  }
  setStatus() {
    /*   set busted status  */
    if (this.handValue.aceAsOne > 21 && this.handValue.aceAsEleven > 21) {
      this.busted();
      this.finish();
    }
    /*   set blackjack status  */
    if (
      this.handValue.aceAsOne === 21 || this.handValue.aceAsEleven === 21
    ) {
      this.blackjack();
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
  busted() {
    this.isBusted = true;
  }
  stay() {
    this.isStaying = true;
  }
  finish() {
    this.isFinished = true;
  }
  blackjack() {
    this.status = D.blackjack;
  }
}

export default Player;
