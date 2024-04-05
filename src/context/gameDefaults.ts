import { MessageBarType } from "@fluentui/react"
import { PlayerStore, PlayingCardDeck } from "../classes"
import { defaultplayersArr } from "../definitions"
import { GameStatus } from "../enums"
import { GameState } from "../types"

export const gameDefaults: GameState = {
  gameStatus: GameStatus.Init,
  deck: new PlayingCardDeck(),
  gameStatusFlag: false,
  isSpinnerVisible: false,
  loser: undefined,
  winner: undefined,
  dealerHasControl: false,
  minimumBet: 25,
  pot: 0,
  round: 0,
  turnCount: 0,
  lastWriteTime: new Date().toISOString(),
  messageBarDefinition: {
    type: MessageBarType.info,
    text: "",
    isMultiLine: false
  },
  controllingPlayer: undefined,
  players: defaultplayersArr,
  activePlayerKeys: undefined,
  currentPlayerKey: undefined,
  playerStore: new PlayerStore(),
}
