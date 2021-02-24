import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

/**
 *  CONTROL PANEL ACTIONS
 */
const controlPanelActions = {
  hideOptionsPanel() {
    AppDispatcher.dispatch({ actionType: AppConstants.CONTROLPANEL_HIDEOPTIONSPANEL });
  },
  showOptionsPanel() {
    AppDispatcher.dispatch({ actionType: AppConstants.CONTROLPANEL_SHOWOPTIONSPANEL });
  },
  toggleDeckVisibility(bool) {
    AppDispatcher.dispatch({ actionType: AppConstants.CONTROLPANEL_TOGGLEDECKVISIBILITY, bool });
  },
  toggleDrawnVisibility(bool) {
    AppDispatcher.dispatch({ actionType: AppConstants.CONTROLPANEL_TOGGLEDRAWNVISIBILITY, bool });
  },
  toggleSelectedVisibility(bool) {
    AppDispatcher.dispatch({ actionType: AppConstants.CONTROLPANEL_TOGGLESELECTEDVISIBLITY, bool });
  },
  toggleDealerHandVisibility(bool) {
    // console.log(`toggleDealerHandVisibility( ${bool} )`);
    AppDispatcher.dispatch({ actionType: AppConstants.CONTROLPANEL_TOGGLEDEALERHANDVISIBILITY, bool });
  },
  toggleHandValueVisibility(bool) {
    // console.log(`toggleHandValueVisibility( ${bool} )`);
    AppDispatcher.dispatch({ actionType: AppConstants.CONTROLPANEL_TOGGLEHANDVALUEVISIBILITY, bool });
  },
  toggleCardTitleVisibility(bool) {
    // console.log(`toggleCardTitleVisibility( ${bool} )`);
    AppDispatcher.dispatch({ actionType: AppConstants.CONTROLPANEL_TOGGLECARDTITLEVISIBILITY, bool });
  },
  toggleActivityLogVisibility(bool) {
    // console.log(`toggleActivityLogVisibility( ${bool} )`);
    AppDispatcher.dispatch({ actionType: AppConstants.CONTROLPANEL_TOGGLEACTIVITYLOGVISIBILITY, bool });
  },
};

/**
 *  DECK ACTIONS
 */
const deckActions = {
  newDeck() {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_NEWDECK });
  },
  draw(num) {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_DRAW, num });
  },
  drawRandom(num) {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_DRAWRANDOM, num });
  },
  drawFromBottomOfDeck(num) {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_DRAWFROMBOTTOMOFDECK, num });
  },
  shuffle() {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_SHUFFLE });
  },
  putOnTopOfDeck(cards) {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_PUTONTOPOFDECK, cards });
  },
  putOnBottomOfDeck(cards) {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_PUTONBOTTOMOFDECK, cards });
  },
  removeSelectedFromPlayerHand(playerKey, cards) {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_REMOVESELECTEDFROMPLAYERHAND, playerKey, cards });
  },
  removeSelectedFromDrawn(cards) {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_REMOVESELECTEDFROMDRAWN, cards });
  },
  select(cardAttributes) {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_SELECT, cardAttributes });
  },
  deselect(cardAttributes) {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_DESELECT, cardAttributes });
  },
};

/**
  *  GAMEPLAY ACTIONS
  */
const gameplayActions = {
  deal() {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_DEAL });
    AppDispatcher.dispatch({ actionType: AppConstants.GAME_DEAL });
  },
  hit(playerKey) {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_HIT, playerKey });
    AppDispatcher.dispatch({ actionType: AppConstants.GAME_HIT });
  },
  stay(playerKey) {
    AppDispatcher.dispatch({ actionType: AppConstants.GAME_STAY, playerKey });
  },
  bet(playerKey, amount) {
    AppDispatcher.dispatch({ actionType: AppConstants.GAME_BET, playerKey, amount });
  },

  /**
   * Start a new game using a list of players
   * @param {array} players array of players objects, including id, key, and title
   */
  newGame(players) {
    /* create a new deck */
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_NEWDECK });

    players.forEach(player => {
      /* add a new Player to the PlayerStore */
      AppDispatcher.dispatch({ actionType: AppConstants.GLOBAL_NEWPLAYER, ...player });
      // AppDispatcher.dispatch({ actionType: AppConstants.DECK_NEWPLAYERHAND, ...player });
    });

  },
  showMessageBar(text, type) {
    AppDispatcher.dispatch({ actionType: AppConstants.GAME_SHOWMESSAGEBAR, text, type });
  },
  hideMessageBar() {
    AppDispatcher.dispatch({ actionType: AppConstants.GAME_HIDEMESSAGEBAR });
  },
  reset() {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_CLEARHANDS });
    AppDispatcher.dispatch({ actionType: AppConstants.GAME_RESET });
  },
  newRound() {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_CLEARHANDS });
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_DEAL });
    AppDispatcher.dispatch({ actionType: AppConstants.GAME_NEWROUND });
    AppDispatcher.dispatch({ actionType: AppConstants.STATS_UPDATE });
  },
};

/**
 * STORE ACTIONS
 */
const storeActions = {
  // Add a new entry to the Activity Log Store
  newActivityLogItem(name, description, iconName) {
    AppDispatcher.dispatch({ actionType: AppConstants.ACTIVITYLOG_NEW, name, description, iconName });
  },

  // Initialize Stores
  initializeStores() {
    AppDispatcher.dispatch({ actionType: AppConstants.INITIALIZE_STORES, });
  },


  /**
   * delete all entries from stores
   */
  clearStores() {
    AppDispatcher.dispatch({ actionType: AppConstants.CLEAR_STORES, });
  }
};

const AppActions = {
  ...controlPanelActions,
  ...deckActions,
  ...gameplayActions,
  ...storeActions,

  /**
   * (experimental) evaluate the game state outside of any single Store
   * @param {number} statusCode current gameStatus code
   */
  evaluateGame(statusCode) {
    // AppDispatcher.dispatch({actionType: AppConstants.GLOBAL_EVALUATEGAME});

   
  }
};

export default AppActions;
