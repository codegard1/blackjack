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
      if (undefined === messageBarDefinition) {
        state.messageBarDefinition = gameDefaults.messageBarDefinition;
      } else {
        state.messageBarDefinition = messageBarDefinition;
      }
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
      switch (gameStatus) {
        case GameStatus.Init:
          console.log('Game Status: Init');
          break;

        case GameStatus.InProgress /*   Game in progress; first play  */:
          console.log('Game Status: InProgress');
          /*   all players bet the minimum to start  */
          // if (state.turnCount === 0) _ante(gameState.minimumBet);
          // setTurnCount(turnCount + 1);
          // endGameTrap();
          break;

        case GameStatus.NextTurn:
          console.log('Game Status: NextTurn');
          /*   stay (go to next turn)  */
          /* If endgame conditions not met   */
          // if (!endGameTrap()) {
          //   /* increment currentPlayerIndex */
          //   playerStore._nextPlayer();
          //   gameDispatch({ type: GameAction.SetGameStatus, gameStatus: GameStatus.InProgress });
          //   endGameTrap();
          // } else {
          //   return false;
          // }
          break;

        case GameStatus.GameOver:
          console.log('Game Status: GameOver');
          // gameDispatch({ type: GameAction.SetGameStatus, gameStatus: GameStatus.Init });
          break;

        case GameStatus.HumanWins:
          console.log('Game Status: HumanWins');
          // const winningPlayerTitle = playerStore.all[0].title;
          // newActivityLogItem(winningPlayerTitle, 'wins!', 'Crown');

          // setWinner(playerStore.all[0].key);
          // setLoser(playerStore.all[1].key);
          // playerStore._payout(playerStore.all[0].key, pot);
          // gameDispatch({ type: GameAction.SetWinner, })
          break;

        case GameStatus.DealerWins:
          console.log('Game Status: DealerWins');
          // state.winner = playerStore.all[1].key;
          // state.loser = playerStore.all[0].key;
          // playerStore._payout(playerStore.all[1].key, pot);
          // newActivityLogItem(playerStore.all[1].title, 'wins!', 'Crown');
          // gameDispatch({ type: GameAction.EndGame });
          break;

        default:
          break;
      }

      return state;
    }

    // TODO
    case GameAction.EndGameTrap: {
      return state;
    }

    // TODO
    case GameAction.ResetGame: {
      return gameDefaults;
    }

    // TODO
    case GameAction.SetLoser: {
      if (undefined !== playerKey) state.loser = playerKey;
      return state;
    }

    // TODO
    case GameAction.SetWinner: {
      if (undefined !== playerKey) state.winner = playerKey;
      return state;
    }

    default: {
      return state;
    }
  }

}
