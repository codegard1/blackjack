import { GameStatus } from "../enums";
import { IGameReducerAction } from "../interfaces";
import { GameState, PlayerKey } from "../types";

/** Amount a player has put into the pot this round (ante plus wagers). */
export function roundStake(state: GameState, key: PlayerKey): number {
  const player = state.playerStore.player(key);
  return (player?.lastAnte ?? 0) + (player?.totalBet ?? 0);
}

/**
 * Pay out the pot and record stats for a finished round.
 * - Win: the winner takes the pot. A human natural blackjack also collects
 *   a 3:2 bonus (half their stake) from the dealer.
 * - Push: every player gets their own stake back.
 * Guarded by gameStatusFlag so a round is never settled twice.
 */
function settleRound(state: GameState): void {
  if (state.gameStatusFlag) return;

  const { playerStore } = state;
  const human = playerStore.all.find((player) => !player.isNPC);
  const dealer = playerStore.all.find((player) => player.isNPC);
  if (!human || !dealer) return;

  const winnings: Record<PlayerKey, number> = {};

  switch (state.gameStatus) {
    case GameStatus.HumanWins: {
      state.winner = human.key;
      state.loser = dealer.key;
      winnings[human.key] = state.pot;
      if (human.isBlackjack) {
        const bonus = Math.min(Math.floor(roundStake(state, human.key) / 2), dealer.bank);
        dealer.bank -= bonus;
        winnings[human.key] += bonus;
      }
      break;
    }
    case GameStatus.DealerWins: {
      state.winner = dealer.key;
      state.loser = human.key;
      winnings[dealer.key] = state.pot;
      break;
    }
    case GameStatus.Push: {
      state.winner = undefined;
      state.loser = undefined;
      playerStore.all.forEach((player) => { winnings[player.key] = roundStake(state, player.key); });
      break;
    }
    default:
      return;
  }

  playerStore.all.forEach((player) => {
    const amount = winnings[player.key] ?? 0;
    if (amount > 0) playerStore.payout(player.key, amount);
    playerStore.updateStats(player.key, {
      numberOfGamesLost: player.key === state.loser ? 1 : 0,
      numberOfGamesPlayed: 1,
      numberOfGamesWon: player.key === state.winner ? 1 : 0,
      numberOfTimesBlackjack: player.isBlackjack ? 1 : 0,
      numberOfTimesBusted: player.isBusted ? 1 : 0,
      totalWinnings: player.key === state.winner ? amount : 0,
      winLossRatio: 0,
    });
  });

  state.gameStatusFlag = true;
}

export function evaluateGame(state: GameState, action: IGameReducerAction): GameState {
  switch (state.gameStatus) {
    case GameStatus.InProgress:
      /* First play of a new game: all players ante the minimum */
      if (state.turnCount === 0) {
        state.pot = 0;
        state.playerStore.all.forEach((player) => {
          if (state.playerStore.ante(player.key, state.minimumBet)) state.pot += state.minimumBet;
        });
        state.turnCount = 1;
      }
      break;

    case GameStatus.NextTurn:
      if (!state.gameStatusFlag) {
        state.playerStore.nextPlayer();
        state.gameStatus = GameStatus.InProgress;
      }
      break;

    case GameStatus.HumanWins:
    case GameStatus.DealerWins:
    case GameStatus.Push:
      settleRound(state);
      break;

    case GameStatus.GameOver:
      state.gameStatus = GameStatus.Init;
      break;

    default:
      break;
  }

  return state;
}
