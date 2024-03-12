import { MessageBarType } from '@fluentui/react';
import { Player, PlayingCard, PlayingCardDeck } from '../classes';
import React from 'react';
import { PlayerCollection } from '../types';

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
  },
  gamePlayActions?: {
    deal: () => void;
    hit: (playerKey: string) => void;
    stay: (playerKey: string) => void;
    bet: (playerKey: string, amount: number) => void;
    newGame: (players: any) => void;
    showMessageBar: (text: string, type: MessageBarType) => void;
    hideMessageBar: () => void;
    reset: () => void;
    newRound: () => void;
  },
  storeActions?: {
    newActivityLogItem: (name: string, description: string, iconName: string) => void;
    initializeStores: () => void;
    clearStores: () => void;
    evaluateGame: (statusCode: number) => void;
    endGame: () => void;
    endGameTrap: (players: any) => void;
  }
}
