import AppDispatcher from "../dispatcher/AppDispatcher";
import AppConstants from "../constants/AppConstants";

export const AppActions = {
  newGame(players) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_NEWGAME,
      players
    });
  },
  newPlayer(id, title) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_NEWPLAYER,
      id,
      title
    });
    AppDispatcher.dispatch({
      actionType: AppConstants.DECK_NEWPLAYERHAND,
      id
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
      actionType: AppConstants.DECK_PUTONBOTTOMOFDECK,
      cards
    });
  },
  putOnBottomOfDeck(cards) {
    AppDispatcher.dispatch({
      actionType: AppConstants.DECK_PUTONTOPOFDECK,
      cards
    });
  },
  removeSelectedFromPlayerHand(playerIndex, cards) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_REMOVESELECTEDFROMPLAYERHAND,
      playerIndex,
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
  clearHand(playerIndex) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_CLEARHAND,
      playerIndex
    });
  },
  deal() {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_DEAL
    });
  },
  hit(ev, target, index) {
    AppDispatcher.dispatch({
      actionType: AppConstants.GAME_HIT,
      ev, target, index
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
