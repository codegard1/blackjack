import { MessageBarType } from "@fluentui/react"
import { GameStatus } from "../enums"
import { GameState } from "../types"

export const gameDefaults: GameState = {
  gameStatus: GameStatus.Init,
  gameStatusFlag: false,
  isSpinnerVisible: false,
  loser: null,
  winner: null,
  dealerHasControl: false,
  minimumBet: 25,
  pot: 0,
  round: 0,
  turnCount: 0,
  lastWriteTime: '',
  messageBarDefinition: {
    type: MessageBarType.info,
    text: "",
    isMultiLine: false
  }
}
