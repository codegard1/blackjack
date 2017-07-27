import keyMirror from "keymirror";
import Immutable from "immutable";

const definitions = Immutable.Record(
  keyMirror({
    busted: null,
    blackjack: null,
    winner: null,
    staying: null
  })
);

export default definitions;