export interface IControlPanelProps {
  gameStatus: number;
  hidden: boolean;
  minimumBet: number;
  player: any,
  playerKey: string,
  playerStatusFlag: boolean;
  selectedFlag: boolean;
  showDeckCallout: () => void,
  isDeckCalloutVisible: boolean;
}
