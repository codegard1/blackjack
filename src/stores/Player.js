class Player {
  constructor(title) {
    this.id = "";
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
}

export default Player;
