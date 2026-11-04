import { PlayerKey } from '../types';

export interface ISplashScreenProps {
  selectedPlayers: PlayerKey[];
  onSelectedPlayersChange: (keys: PlayerKey[]) => void;
}
