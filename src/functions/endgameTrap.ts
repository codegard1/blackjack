import { GameStatus } from "../enums";
import { IGameReducerAction } from "../interfaces";
import { GameState, PlayerStats } from "../types";

export function endgameTrap(state: GameState, action: IGameReducerAction): GameState {
const timerName = 'endgameTrap';
console.time(timerName)

  let nextGameStatus = state.gameStatus ? state.gameStatus : GameStatus.InProgress;
  const playerStore = state.playerStore;

  /* Set next game status */
  if (playerStore.all[1].isBlackjack) {
    nextGameStatus = GameStatus.DealerWins; // Dealer has blackjack ; dealer wins
  } else if (playerStore.all[0].isBusted) {
    nextGameStatus = GameStatus.DealerWins; // Player 0 busted ; dealer wins
  } else if (playerStore.all[1].isBusted) {
    nextGameStatus = GameStatus.HumanWins; // Dealer is busted; Player 0 wins
  } else if (playerStore.all[1].isStaying) {
    if (
      state.deck.getHandValue(playerStore.all[1].key) >
      state.deck.getHandValue(playerStore.all[0].key)
    ) {
      nextGameStatus = GameStatus.DealerWins; // Dealer has higher hand ; dealer wins
    } else {
      nextGameStatus = GameStatus.HumanWins; // Player 0 has higher hand ; Player 0 wins
    }
  } else {
    if (playerStore.currentPlayer?.isNPC) {
      state.gameStatusFlag = true;
    } else {
      /* player 0 is not Dealer */
      state.gameStatus = GameStatus.InProgress;
      state.gameStatusFlag = false;
    }
  }

  /* Endgame Condition encountered! */
  if (nextGameStatus > 2) {
    // _evaluateGame(nextGameStatus);

    playerStore.all.forEach(player => {
      /* set properties to increment */
      const statsFrame: PlayerStats = {
        numberOfGamesLost: (player.key === state.loser ? 1 : 0),
        numberOfGamesPlayed: 1,
        numberOfGamesWon: (player.key === state.winner ? 1 : 0),
        numberOfTimesBlackjack: (player.isBlackjack ? 1 : 0),
        numberOfTimesBusted: (player.isBusted ? 1 : 0),
        totalWinnings: (player.key === state.winner ? state.pot : 0),
        winLossRatio: 0,
      };
      state.playerStore.updateStats(player.key, statsFrame);
    });
    state.gameStatusFlag = true;
  }

  console.timeEnd(timerName)
  return state;
}
