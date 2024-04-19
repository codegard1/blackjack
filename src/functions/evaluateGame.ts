import { GameStatus } from "../enums";
import { IGameReducerAction } from "../interfaces";
import { GameState } from "../types";
import { endgameTrap } from "./endgameTrap";

export function evaluateGame(state: GameState, action: IGameReducerAction): GameState {
  const timerName = 'evaluateGame';
  console.time(timerName);

  // Evalute Game State
  switch (state.gameStatus) {
    case GameStatus.Init:
      console.log('Game Status: Init');
      break;

    case GameStatus.InProgress:
      /*   Game in progress; first play  */
      console.log('Game Status: InProgress');
      /*   all players bet the minimum to start  */
      if (state.turnCount === 0) state.playerStore.allPlayersAnte(state.minimumBet);
      state.pot = state.minimumBet * 2;
      state.turnCount = state.turnCount + 1;
      endgameTrap(state, action);
      break;

    case GameStatus.NextTurn:
      console.log('Game Status: NextTurn');
      /*   stay (go to next turn)  */
      /* If endgame conditions not met   */
      if (!state.gameStatusFlag) {
        /* increment currentPlayerIndex */
        state.playerStore.nextPlayer();
        state.gameStatus = GameStatus.InProgress;
      }
      break;

    case GameStatus.GameOver:
      console.log('Game Status: GameOver');
      state.gameStatus = GameStatus.Init;
      break;

    case GameStatus.HumanWins:
      console.log('Game Status: HumanWins');
      const winningPlayerTitle = state.playerStore.all[0].title;
      // newActivityLogItem(winningPlayerTitle, 'wins!', 'Crown');

      state.winner = state.playerStore.all[0].key;
      state.loser = state.playerStore.all[1].key;
      state.playerStore.payout(state.playerStore.all[0].key, state.pot);
      break;

    case GameStatus.DealerWins:
      console.log('Game Status: DealerWins');
      state.winner = state.playerStore.all[1].key;
      state.loser = state.playerStore.all[0].key;
      state.playerStore.payout(state.playerStore.all[1].key, state.pot);
      // newActivityLogItem(playerStore.all[1].title, 'wins!', 'Crown');
      endgameTrap(state, action);
      break;

    default:
      break;
  }

  console.timeEnd(timerName);
  return state;
}