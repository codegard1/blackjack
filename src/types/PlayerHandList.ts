import { PlayerKey } from "./BasePlayer";
import { PlayerHand } from "./PlayerHand";

export type PlayerHandList = {
  [index: PlayerKey]: PlayerHand;
}
