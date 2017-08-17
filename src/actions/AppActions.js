import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

export const AppActions = {
  newGame(players) {
    /* create a new deck */
    AppDispatcher.dispatch({
      actionType: AppConstants.DECK_NEWDECK
    });

    /* GAME_NEWPLAYER depends on a playerHand being available */
    players.forEach(player => {
      AppDispatcher.dispatch({
        actionType: AppConstants.DECK_NEWPLAYERHAND,
        id: player.id
      });

      /* add a new Player to the players array */
      AppDispatcher.dispatch({
        actionType: AppConstants.GAME_NEWPLAYER,
        id: player.id,
        title: player.title
      });
    });
  },
  showMessageBar(text, type) {
    AppDispatcher.dispatch({
      actionType: AppConstants.CONTROLPANEL_SHOWMESSAGEBAR,
      text,
      type
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
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_NEWROUND
    });
    AppDispatcher.dispatch({
      actionType: AppConstants.DECK_CLEARHANDS
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
  },
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
  deal() {
    AppDispatcher.dispatch({
      actionType: AppConstants.DECK_DEAL
    });
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_DEAL
    });
  },
  hit(ev, target) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_HIT,
      ev, target
    });
  },
  stay() {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_STAY
    });
  },
  bet(ev, target, playerIndex, amount) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_BET,
      ev, target, playerIndex, amount
    });
  },
  ante(amount, players, pot) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_ANTE,
      amount, players, pot
    });
  }

};

export default AppActions;
