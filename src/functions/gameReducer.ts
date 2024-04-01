import { gameDefaults } from "../ctx/gameDefaults";
import { GameStatus } from "../enums";
import { GameAction } from "../enums/GameAction";
import { IGameReducerAction } from "../interfaces";
import { GameState } from "../types";

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
    playerKey,
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
      state.controllingPlayer = controllingPlayerKey;
      state.dealerHasControl = controllingPlayerKey === 'dealer';
      return state;
    }

    case GameAction.SetGameStatus: {
      if (undefined !== gameStatus) state.gameStatus = gameStatus;
      return state;
    }

    // TODO
    case GameAction.EndGame: {
      return state;
    }

    // TODO
    case GameAction.NewGame: {
      // state.controllingPlayer = undefined;
      state.gameStatus = GameStatus.Init;
      state.pot = 0;
      state.round = state.round + 1;
      state.turnCount = 0;
      return state;
    }

    // TODO
    case GameAction.EvaluateGame: {
      return state;
    }

    // TODO
    case GameAction.EndGameTrap: {
      return state;
    }

    // TODO
    case GameAction.ResetGame: {
      state = gameDefaults;
      return state;
    }

    // TODO
    case GameAction.SetLoser: {
      return state;
    }

    // TODO
    case GameAction.SetWinner: {
      return state;
    }

    default: {
      return state;
    };
  }

}
