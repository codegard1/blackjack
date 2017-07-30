import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

export const AppActions = {
  newGame(players) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_NEWGAME,
      players
    });
  },
  newPlayer(title) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_NEWPLAYER,
      title
    });
  },
  showMessageBar(text, type) {
    AppDispatcher.dispatch({
      actionType: AppConstants.CONTROLPANEL_SHOWMESSAGEBAR,
      text,
      type
    });
  },
  evaluateHand(hand) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_EVALUATEHAND,
      hand
    });
  },
  evaluateGame(nextGameStatus, nextPlayer) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_EVALUATEGAME,
      nextGameStatus,
      nextPlayer
    });
  },
  getPlayerById(id) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_GETPLAYERBYID,
      id
    });
  },
  getHighestHandValue(player) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_GETHIGHESTHANDVALUE,
      player
    });
  },
  payout(players, index, amount) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_PAYOUT,
      players,
      index,
      amount
    });
  },
  evaluatePlayers(players) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_EVALUATEPLAYERS,
      players
    });
  },
  reset() {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_RESET
    });
  },
  newRound() {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_NEWROUND
    });
  },
  hideOptionsPanel() {
    AppDispatcher.dispatch({
      actionType: AppConstants.CONTROLPANEL_HIDEOPTIONSPANEL
    });
  },
  showOptionsPanel() {
    AppDispatcher.dispatch({
      actionType: AppConstants.CONTROLPANEL_SHOWOPTIONSPANEL
    });
  },
  newDeck() {
    AppDispatcher.dispatch({
      actionType: AppConstants.DECK_NEWDECK
    });
  },
  toggleDeckVisibility(bool) {
    AppDispatcher.dispatch({
      actionType: AppConstants.CONTROLPANEL_TOGGLEDECKVISIBILITY,
      bool
    });
  },
  toggleDrawnVisibility(bool) {
    AppDispatcher.dispatch({
      actionType: AppConstants.CONTROLPANEL_TOGGLEDRAWNVISIBILITY,
      bool
    });
  },
  toggleSelectedVisibility(bool) {
    AppDispatcher.dispatch({
      actionType: AppConstants.CONTROLPANEL_TOGGLESELECTEDVISIBLITY,
      bool
    });
  }
};

export default AppActions;
