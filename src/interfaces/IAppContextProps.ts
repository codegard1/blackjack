import { MessageBarType } from '@fluentui/react';
import { PlayingCard, PlayingCardDeck } from '../classes';
import React from 'react';

export interface IAppContextProps {
  deck: PlayingCardDeck;
  isCardDescVisible?: boolean; // ControlPanelStore
  isDealerHandVisible?: boolean; // ControlPanelStore 
  isHandValueVisible?: boolean; // ControlPanelStore
  isDeckVisible?: boolean;
  isDrawnVisible?: boolean;
  isOptionsPanelVisible?: boolean;
  isSelectedVisible?: boolean;
  isCardTitleVisible?: boolean;
  isActivityLogVisible?: boolean;
  player?: any; // GameStore
  gameStatusFlag?: boolean; // props
  gameStatus?: number; // GameStore
  settingActions?: {
    setDealerHandVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setHandValueVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setDeckVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setDrawnVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setCardTitleVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setActivityLogVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setOptionsPanelVile: React.Dispatch<React.SetStateAction<boolean>>;
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
