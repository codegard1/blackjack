import React from 'react';
import { Player, PlayingCard, PlayingCardDeck } from '../classes';
import { MessageBarDefinition, PlayerCollection, PlayerKey } from '../types';
import { GameStatus } from '../enums/GameStatus';

export interface IAppContextProps {
  deck: PlayingCardDeck;
  players: PlayerCollection | Player[];
  gameStatusFlag?: boolean;
  gameStatus?: number;
  settingStore: {
    isCardDescVisible: boolean;
    isDealerHandVisible: boolean;
    isHandValueVisible: boolean;
    isDeckVisible: boolean;
    isDrawnVisible: boolean;
    isOptionsPanelVisible: boolean;
    isSelectedVisible: boolean;
    isCardTitleVisible: boolean;
    isActivityLogVisible: boolean;
    isSplashScreenVisible: boolean;
    setDealerHandVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setHandValueVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setDeckVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setDrawnVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setCardTitleVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setActivityLogVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setOptionsPanelVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setSplashScreenVisible: React.Dispatch<React.SetStateAction<boolean>>;
  }
  gameStore: {
    deal: (key: PlayerKey) => void;
    hit: (key: PlayerKey) => void;
    stay: (key: PlayerKey) => void;
    bet: (key: PlayerKey, amount: number) => void;
    newGame: (keys: PlayerKey[]) => void;
    showMessageBar: (d: MessageBarDefinition) => void;
    hideMessageBar: () => void;
    resetGame: () => void;
    newRound: () => void;
    dealerHasControl: boolean;
    lastWriteTime: string;
    loser: PlayerKey | undefined;
    messageBarDefinition: MessageBarDefinition;
    minimumBet: number;
    pot: number;
    round: number;
    setDealerHasControl: React.Dispatch<React.SetStateAction<boolean>>;
    setLastWriteTime: React.Dispatch<React.SetStateAction<string>>;
    setLoser: React.Dispatch<React.SetStateAction<PlayerKey | undefined>>;
    setMessageBarDefinition: React.Dispatch<React.SetStateAction<MessageBarDefinition>>;
    setMinimumBet: React.Dispatch<React.SetStateAction<number>>;
    setPot: React.Dispatch<React.SetStateAction<number>>;
    setRound: React.Dispatch<React.SetStateAction<number>>;
    setTurnCount: React.Dispatch<React.SetStateAction<number>>;
    setWinner: React.Dispatch<React.SetStateAction<PlayerKey | undefined>>;
    turnCount: number;
    winner: PlayerKey | undefined;
  }
  deckActions?: {
    newDeck: () => PlayingCardDeck;
    draw: (num: number) => void;
    drawRandom: (num: number) => void;
    drawFromBottomOfDeck: (num: number) => void;
    shuffle: () => void;
    putOnTopOfDeck: (cards: PlayingCard[]) => void;
    putOnBottomOfDeck: (cards: PlayingCard[]) => void;
    removeSelectedFromPlayerHand: (playerKey: string, cards: PlayingCard[]) => void;
    removeSelectedFromDrawn: (cards: PlayingCard[]) => void;
    select: (cardAttributes: any) => void;
    deselect: (cardAttributes: any) => void;
  }
  storeActions?: {
    newActivityLogItem: (name: string, description: string, iconName: string) => void;
    initializeStores: () => void;
    clearStores: () => void;
    evaluateGame: (statusCode: GameStatus) => void;
    endGame: () => void;
    endGameTrap: () => boolean;
  }
}
