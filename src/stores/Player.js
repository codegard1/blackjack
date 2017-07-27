import Immutable from "immutable";

const Player = Immutable.Record(
  {
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
  },
  "Player"
);

export default Player;
