export interface IControlPanelProps {
  hidden: boolean;
  isDeckCalloutVisible: boolean;
  playerKey: string,
  playerStatusFlag: boolean;
  selectedFlag: boolean;
  showDeckCallout: () => void,
}
