import { MessageBarType } from "@fluentui/react"
import { GameStatus } from "../enums"
import { GameState } from "../types"
import { PlayerStore } from "../classes"

export const gameDefaults: GameState = {
  gameStatus: GameStatus.Init,
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
  players: undefined,
  activePlayerKeys: undefined,
  currentPlayerKey: undefined,
  playerStore: new PlayerStore(),
}
