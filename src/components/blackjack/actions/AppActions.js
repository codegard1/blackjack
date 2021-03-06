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
    AppDispatcher.dispatch({
      actionType: AppConstants.DECK_NEWDECK
    });
  },
  draw(num) {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_DRAW, num });
  },
  drawRandom(num) {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_DRAWRANDOM, num });
  },
  drawFromBottomOfDeck(num) {
    AppDispatcher.dispatch({
      actionType: AppConstants.DECK_DRAWFROMBOTTOMOFDECK,
      num
    });
  },
  shuffle() {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_SHUFFLE });
  },
  putOnTopOfDeck(cards) {
    AppDispatcher.dispatch({
      actionType: AppConstants.DECK_PUTONTOPOFDECK,
      cards
    });
  },
  putOnBottomOfDeck(cards) {
    AppDispatcher.dispatch({
      actionType: AppConstants.DECK_PUTONBOTTOMOFDECK,
      cards
    });
  },
  removeSelectedFromPlayerHand(playerId, cards) {
    AppDispatcher.dispatch({
      actionType: AppConstants.DECK_REMOVESELECTEDFROMPLAYERHAND,
      playerId,
      cards
    });
  },
  removeSelectedFromDrawn(cards) {
    AppDispatcher.dispatch({
      actionType: AppConstants.DECK_REMOVESELECTEDFROMDRAWN,
      cards
    });
  },
  select(cardAttributes) {
    AppDispatcher.dispatch({
      actionType: AppConstants.DECK_SELECT,
      cardAttributes
    });
  },
  deselect(cardAttributes) {
    AppDispatcher.dispatch({
      actionType: AppConstants.DECK_DESELECT,
      cardAttributes
    });
  },
};

/**
  *  GAMEPLAY ACTIONS
  */
const gameplayActions = {
  deal() {
    AppDispatcher.dispatch({
      actionType: AppConstants.DECK_DEAL
    });
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_DEAL
    });
  },
  hit(playerId) {
    AppDispatcher.dispatch({
      actionType: AppConstants.DECK_HIT,
      playerId
    });
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_HIT
    });
  },
  stay(playerId) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_STAY,
      playerId
    });
  },
  bet(playerId, amount) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_BET,
      playerId,
      amount
    });
  },
  newGame(players) {
    /* create a new deck */
    AppDispatcher.dispatch({
      actionType: AppConstants.DECK_NEWDECK
    });

    players.forEach(player => {
      AppDispatcher.dispatch({
        actionType: AppConstants.DECK_NEWPLAYERHAND,
        id: player.id
      });

      /* add a new Player to the players array */
      AppDispatcher.dispatch({
        actionType: AppConstants.GAME_NEWPLAYER,
        id: player.id,
        title: player.title,
        isNPC: player.isNPC
      });

      /* Create a Stats object for the player */
      AppDispatcher.dispatch({
        actionType: AppConstants.STATS_NEW,
        playerId: player.id
      });
    });
  },
  showMessageBar(text, type) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_SHOWMESSAGEBAR,
      text,
      type
    });
  },
  hideMessageBar() {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_HIDEMESSAGEBAR
    });
  },
  reset() {
    AppDispatcher.dispatch({
      actionType: AppConstants.DECK_CLEARHANDS
    });
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_RESET
    });
  },
  newRound() {
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_CLEARHANDS });
    AppDispatcher.dispatch({ actionType: AppConstants.DECK_DEAL });
    AppDispatcher.dispatch({ actionType: AppConstants.GAME_NEWROUND });
    AppDispatcher.dispatch({ actionType: AppConstants.STATS_UPDATE });
  },
};

const AppActions = {
  ...controlPanelActions,
  ...deckActions,
  ...gameplayActions,

  // Add a new entry to the Activity Log Store
  newActivityLogItem(name, description, iconName) {
    AppDispatcher.dispatch({ actionType: AppConstants.ACTIVITYLOG_NEW, name, description, iconName });
  },

  // Initialize Stores
  initializeStores() {
    AppDispatcher.dispatch({ actionType: AppConstants.INITIALIZE_STORES, });
  },
};

export default AppActions;
