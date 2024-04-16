import { PlayingCardDeck } from ".";
import { gameDefaults, settingDefaults } from "../context";
import { StoreName } from "../enums";
import { GameState, PlayerCollection, SettingsState } from "../types";

interface IGame {
  players: PlayerCollection;
  deck: PlayingCardDeck;
  state: GameState;
  settings: SettingsState;
  save: (store: StoreName) => void;
  load: (store: StoreName) => void;
  reset: () => void;
}

interface IBlackjackProps {
  players: PlayerCollection;
  deck: PlayingCardDeck;
  state: GameState;
  settings: SettingsState;
}

/**
 * Abstract representation of the game not necessarily for use in production
 */
export class Blackjack implements IGame {
  public players = {};
  public deck = new PlayingCardDeck();
  public state = gameDefaults;
  public settings = settingDefaults;

  constructor(options?: IBlackjackProps) {
    if (!options) return;
    const { players, deck, state, settings, } = options;
    if (players) this.players = players;
    if (deck) this.deck = deck;
    if (state) this.state = state;
    if (settings) this.players = settings;
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

  public reset() {
    // TODO
    return;
  }
}
