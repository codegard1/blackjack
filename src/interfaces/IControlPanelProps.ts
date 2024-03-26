export interface IControlPanelProps {
  // gameStatus: number;
  // minimumBet: number;
  hidden: boolean;
  isDeckCalloutVisible: boolean;
  player: any,
  playerKey: string,
  playerStatusFlag: boolean;
  selectedFlag: boolean;
  showDeckCallout: () => void,
}
