import { IPlayer } from "./IPlayer";

export interface IDeckCalloutProps {
  player: IPlayer;
  hidden: boolean;
  onHideCallout: () => void;
  target: string;
}
