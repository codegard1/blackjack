import keyMirror from "keymirror";

export default keyMirror({
  /* Game */
  GAME_BET: null,
  GAME_DEAL: null,
  GAME_HIT: null,
  GAME_NEWPLAYER: null,
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
  CONTROLPANEL_HIDEOPTIONSPANEL: null,
  CONTROLPANEL_SHOWMESSAGEBAR: null,
  CONTROLPANEL_HIDEMESSAGEBAR: null,
  CONTROLPANEL_SHOWOPTIONSPANEL: null,
  CONTROLPANEL_TOGGLEDECKVISIBILITY: null,
  CONTROLPANEL_TOGGLEDRAWNVISIBILITY: null,
  CONTROLPANEL_TOGGLESELECTEDVISIBLITY: null,
  CONTROLPANEL_TOGGLEHANDVALUEVISIBILITY: null,
  CONTROLPANEL_TOGGLEDEALERHANDVISIBILITY: null,
  CONTROLPANEL_TOGGLECARDTITLEVISIBILITY: null,
  
  // following line is experimental
  CONTROLPANEL_SELECTPLAYER:null,

  /* StatsStore */
  STATS_NEW: null,
  STATS_UPDATE: null
});
