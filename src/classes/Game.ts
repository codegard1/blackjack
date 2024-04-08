import { GameState, PlayerCollection, PlayerKey } from "../types";
import { Player, PlayerStore, PlayingCard, PlayingCardDeck } from ".";
import { OptionsPanel } from "../components";
import { GameStatus, StoreName } from "../enums";
import { gameDefaults } from "../context";

interface IGame {
  state: GameState;
  save: (store: StoreName) => void;
  load: (store: StoreName) => void;
}

interface IBlackjackProps {
  players?: Player[] | PlayerCollection;
  deck?: PlayingCard[] | PlayingCardDeck;
  gameState?: {
    activePlayerKeys?: PlayerKey[];
    controllingPlayer?: PlayerKey;
    currentPlayerKey?: PlayerKey;
    dealerHasControl?: boolean;
    deck?: PlayingCardDeck;
    gameStatus?: GameStatus;
    gameStatusFlag?: boolean;
    isSpinnerVisible?: boolean;
    lastWriteTime?: string;
    loser?: PlayerKey;
    minimumBet?: number;
    players?: any[];
    pot?: number;
    round?: number;
    turnCount?: number;
    winner?: PlayerKey;
  }
}

/**
 * Abstract representation of the game not necessarily for use in production
 */
export class Blackjack implements IGame {
  public state: GameState;

  constructor(options?: IBlackjackProps) {
    this.state = gameDefaults;
  }

  public get deck(): PlayingCardDeck {
    return this.state.deck;
  }

  public get players(): Player[] {
    return this.state.playerStore.all;
  }

  // Save game data to localStorage
  public save(store: StoreName) {
    // TODO
    return;
  }


  // Load game data from localStorage
  public load(store: StoreName) {
    // TODO
    return;
  }

}
