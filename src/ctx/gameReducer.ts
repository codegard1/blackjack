import { IGameReducerAction } from "../interfaces";
import { GameState } from "../types";
import { GameAction } from "../enums/GameAction";

/**
 * Reducer function for game state
 * @param state game state object
 * @param action action containing the state parameters
 * @returns modified game state
 */
export function gameReducer(state: GameState, action: IGameReducerAction) {

  const {
    controllingPlayerKey,
    gameStatus,
    messageBarDefinition,
    minimumBet,
    potIncrement,
    type,
  } = action;

  switch (type) {
    // Toggle visibility of the spinner
    case GameAction.SetSpinnerVisible: {
      state.isSpinnerVisible = !state.isSpinnerVisible;
      return state;
    }

    case GameAction.ShowMessageBar: {
      if (undefined !== messageBarDefinition)
        state.messageBarDefinition = messageBarDefinition;
      return state;
    }

    case GameAction.SetMinimumBet: {
      if (undefined !== minimumBet)
        state.minimumBet = minimumBet;
      return state;
    }

    case GameAction.AddToPot: {
      if (undefined !== potIncrement)
        state.pot += potIncrement;
      return state;
    }

    case GameAction.IncrementRound: {
      state.round += 1;
      return state;
    }

    case GameAction.IncrementTurn: {
      state.turnCount += 1;
      return state;
    }

    case GameAction.SetControllingPlayer: {
      if (undefined !== controllingPlayerKey) {
        state.controllingPlayer = controllingPlayerKey;
        state.dealerHasControl = controllingPlayerKey === 'dealer';
      }
      return state;
    }

    case GameAction.SetGameStatus: {
      if (undefined !== gameStatus) state.gameStatus = gameStatus;
      return state;
    }

    default: {
      return state;
    };
  }

}
