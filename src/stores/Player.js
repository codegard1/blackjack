class Player {
  constructor(id, title) {
    this.bank = 1000;
    this.bet = 0;
    this.handValue = { aceAsOne: 0, aceAsEleven: 0 };
    this.hasBlackjack = false;
    this.id = id;
    this.isBusted = false;
    this.isFinished = false;
    this.isStaying = false;
    this.lastAction = "none"; /* unused */
    this.status = "ok";
    this.title = title;
    this.turn = false;
  }
  remove(...keys) {
    const defaults = {
      bank: 1000,
      bet: 0,
      handValue: { aceAsOne: 0, aceAsEleven: 0 },
      hasBlackjack: false,
      id: "",
      isBusted: false,
      isFinished: false,
      isStaying: false,
      lastAction: "none", /* unused, deprecated */
      status: "ok", /* deprecated */
      title: "",
      turn: false,
    };
    keys.forEach(key => { this[key] = defaults[key]; });
  }
  resetStatus() {
    /* AKA NewRound; resets properties that are bound to a single round of play */
    this.remove([
      'bet',
      'handValue',
      'hasBlackjack',
      'isBusted',
      'isFinished',
      'isStaying',
      'lastAction',
      'status',
      'turn',
    ]);
  }
  resetAll() {
    this.remove([
      'bank',
      'bet',
      'handValue',
      'hasBlackjack',
      'isBusted',
      'isFinished',
      'isStaying',
      'lastAction',
      'status',
      'turn',
    ])
  }
  setStatus() {
    /*   set busted status  */
    if (this.handValue.aceAsOne > 21 && this.handValue.aceAsEleven > 21) {
      this.bust();
      this.finish();
    }
    /*   set blackjack status  */
    if (
      this.handValue.aceAsOne === 21 || this.handValue.aceAsEleven === 21
    ) {
      this.blackjack();
    }
  }
  getHigherHandValue() {
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
  bet(amount) {
    this.pot -= amount;
    this.bet = amount;
    this.lastAction = 'bet';
  }
  ante(amount) {
    this.bank -= amount;
    this.lastAction = 'ante';
  }
  hit() {
    /* Deckstore adds a card to this player's hand */
    this.lastAction = 'hit';
  }
  bust() {
    this.isBusted = true;
    this.finish();
  }
  stay() {
    this.isStaying = true;
    this.lastAction = 'stay';
  }
  /* the player can not perform any more actions */
  finish() {
    this.endTurn();
    this.isFinished = true;
  }
  blackjack() {
    this.hasBlackjack = true;
  }
  startTurn() {
    this.turn = true;
    this.isFinished = false;
  }
  endTurn() {
    this.turn = false;
    this.lastAction = 'endTurn';
  }
}

export default Player;
