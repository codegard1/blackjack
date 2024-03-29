import keyMirror from "keymirror";

export default keyMirror({
  /* GLobal Actions */
  // These constants map to actions that occur in multiple stores simultaneously
  GLOBAL_NEWPLAYER: null,
  GLOBAL_EVALUATEGAME: null,
  GLOBAL_ENDGAME: null,

  /* Game */
  GAME_BET: null,
  GAME_DEAL: null,
  GAME_HIT: null,
  GAME_NEWROUND: null,
  GAME_RESET: null,
  GAME_STAY: null,


  /* Deck */
  DECK_CLEARHANDS: null,
  DECK_DEAL: null,
  DECK_DESELECT: null,
  DECK_DRAW: null,
  DECK_DRAWFROMBOTTOMOFDECK: null,
  DECK_DRAWRANDOM: null,
  DECK_HIT: null,
  DECK_NEWDECK: null,
  DECK_NEWPLAYERHAND: null,
  DECK_PUTONBOTTOMOFDECK: null,
  DECK_PUTONTOPOFDECK: null,
  DECK_REMOVESELECTEDFROMDRAWN: null,
  DECK_REMOVESELECTEDFROMPLAYERHAND: null /* orphaned */,
  DECK_RESET: null,
  DECK_SELECT: null,
  DECK_SHUFFLE: null,

  /* ControlPanel */
  CONTROLPANEL_TOGGLEDECKVISIBILITY: null,
  CONTROLPANEL_TOGGLEDRAWNVISIBILITY: null,
  CONTROLPANEL_TOGGLESELECTEDVISIBLITY: null,
  CONTROLPANEL_TOGGLEHANDVALUEVISIBILITY: null,
  CONTROLPANEL_TOGGLEDEALERHANDVISIBILITY: null,
  CONTROLPANEL_TOGGLECARDTITLEVISIBILITY: null,
  CONTROLPANEL_TOGGLEACTIVITYLOGVISIBILITY: null,

  // call initialize() on stores
  INITIALIZE_STORES: null,

  // call clear() on stores
  CLEAR_STORES: null,

  /* StatsStore */
  STATS_UPDATE: null,

  /* ActivityLogStore */
  ACTIVITYLOG_NEW: null,

});     
