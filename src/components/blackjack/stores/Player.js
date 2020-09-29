class Player {
  constructor(id, title, isNPC) {
    this.bank = 1000;
    this.bet = 0;
    this.handValue = { aceAsOne: 0, aceAsEleven: 0 };
    this.hasBlackjack = false;
    this.id = id;
    this.isBusted = false;
    this.isFinished = false;
    this.isNPC = isNPC;
    this.isStaying = false;
    this.lastAction = "none";
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
      isNPC: false,
      isBusted: false,
      isFinished: false,
      isStaying: false,
      lastAction: "none",
      status: "ok",
      title: "",
      turn: false
    };
    keys.forEach(key => {
      // console.log(`this[${key}] = defaults[${key}] = ${defaults[key]};`)
      this[key] = defaults[key];
    });
  }
  resetStatus() {
    /* AKA NewRound; resets properties that are bound to a single round of play */
    this.remove(
      "bet",
      "handValue",
      "hasBlackjack",
      "isBusted",
      "isFinished",
      "isStaying",
      "lastAction",
      "status",
      "turn"
    );
  }
  resetAll() {
    this.resetStatus();
    this.remove("bank");
  }
  setStatus() {
    /*   set busted status  */
    if (this.handValue.aceAsOne > 21 && this.handValue.aceAsEleven > 21) {
      this.bust();
    } else if (
      /*   set blackjack status  */
      this.handValue.aceAsOne === 21 ||
      this.handValue.aceAsEleven === 21
    ) {
      this.blackjack();
    }
  }
  getHigherHandValue() {
    let higherHandValue = 0;

    if (this.handValue.aceAsEleven === this.handValue.aceAsOne) {
      return this.handValue.aceAsOne;
    } else {
      higherHandValue =
        this.handValue.aceAsOne > this.handValue.aceAsEleven
          ? this.handValue.aceAsOne
          : this.handValue.aceAsEleven;
      return higherHandValue;
    }
  }
  bet(amount) {
    this.pot -= amount;
    this.bet = amount;
    this.lastAction = "bet";
    this.log(`bet ${amount}`);
  }
  ante(amount) {
    this.bank -= amount;
    this.lastAction = "ante";
    this.log(`ante ${amount}`);
  }
  hit() {
    /* Deckstore adds a card to this player's hand */
    this.lastAction = "hit";
    this.log(`hit`);
  }
  bust() {
    this.isBusted = true;
    this.finish();
    this.log(`busted`);
  }
  stay() {
    this.isStaying = true;
    this.lastAction = "stay";
    this.finish();
    this.log(`stayed`);
  }
  /* the player can not perform any more actions */
  finish() {
    this.endTurn();
    this.isFinished = true;
    this.log(`finished`);
  }
  blackjack() {
    this.hasBlackjack = true;
    this.log(`has blackjack`);
  }
  startTurn() {
    this.turn = true;
    this.isFinished = false;
    this.lastAction = "startTurn";
    this.log(`started turn`);
  }
  endTurn() {
    this.turn = false;
    this.lastAction = "endTurn";
    this.log(`ended turn`);
  }
  log(msg) {
    console.log(`Player Action: ${this.title} - ${msg}`);
  }
}

export default Player;
