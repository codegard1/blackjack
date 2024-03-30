import React from 'react';
import { MessageBarDefinition, PlayerKey } from '../types';
import { GameStatus } from '../enums/GameStatus';

export interface IGameStoreProps {
  bet: (key: PlayerKey, amount: number) => void;
  deal: (key: PlayerKey) => void;
  dealerHasControl: boolean;
  endGame: () => void;
  endGameTrap: () => boolean;
  evaluateGame: (statusCode: GameStatus) => void;
  gameStatusFlag: boolean;
  hideMessageBar: () => void;
  hit: (key: PlayerKey) => void;
  lastWriteTime: string;
  loser: PlayerKey | undefined;
  messageBarDefinition: MessageBarDefinition;
  newActivityLogItem: (name: string, description: string, iconName: string) => void;
  newGame: (keys: PlayerKey[]) => void;
  newRound: () => void;
  pot: number;
  resetGame: () => void;
  round: number;
  setDealerHasControl: React.Dispatch<React.SetStateAction<boolean>>;
  setLastWriteTime: React.Dispatch<React.SetStateAction<string>>;
  setLoser: React.Dispatch<React.SetStateAction<PlayerKey | undefined>>;
  setMessageBarDefinition: React.Dispatch<React.SetStateAction<MessageBarDefinition>>;
  setPot: React.Dispatch<React.SetStateAction<number>>;
  setRound: React.Dispatch<React.SetStateAction<number>>;
  setTurnCount: React.Dispatch<React.SetStateAction<number>>;
  setWinner: React.Dispatch<React.SetStateAction<PlayerKey | undefined>>;
  showMessageBar: (d: MessageBarDefinition) => void;
  stay: (key: PlayerKey) => void;
  turnCount: number;
  winner: PlayerKey | undefined;
}
