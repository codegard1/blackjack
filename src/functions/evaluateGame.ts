import { GameStatus } from "../enums";
import { IGameReducerAction, IPlayer } from "../interfaces";
import { GameState, PlayerKey } from "../types";
import { recordActivity } from "./activity";

/** Amount a player has put into the pot this round (ante plus wagers). */
export function roundStake(state: GameState, key: PlayerKey): number {
  const player = state.playerStore.player(key);
  return (player?.lastAnte ?? 0) + (player?.totalBet ?? 0);
}

/**
 * Log a player's result for the round. The amount is the bank change from the payout
 * (zero for a loss, whose stake was already logged when it went in).
 */
function recordOutcome(state: GameState, player: IPlayer, amount: number): void {
  if (state.gameStatus === GameStatus.Push) {
    recordActivity(state, player.title, 'stake returned', 'push', { amount });
  } else if (player.key === state.winner) {
    recordActivity(state, player.title, player.isBlackjack ? 'won the pot with blackjack' : 'won the pot', 'win', { amount });
  } else {
    recordActivity(state, player.title, 'lost the round', 'loss');
  }
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
        if (bonus > 0) recordActivity(state, dealer.title, 'paid the 3:2 blackjack bonus', 'loss', { amount: -bonus });
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
    recordOutcome(state, player, amount);
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

/**
 * Apply status-driven bookkeeping to the game state.
 *
 * Starts a game's ante, advances to the next player, settles completed rounds,
 * or resets a game-over status. The supplied state is updated and returned.
 *
 * @param state Current game state to evaluate.
 * @param action Reducer action that requested the evaluation.
 * @returns The updated game state.
 */
export function evaluateGame(state: GameState, action: IGameReducerAction): GameState {
  switch (state.gameStatus) {
    case GameStatus.InProgress:
      /* First play of a new game: all players ante the minimum */
      if (state.turnCount === 0) {
        state.pot = 0;
        state.playerStore.all.forEach((player) => {
          if (state.playerStore.ante(player.key, state.minimumBet)) {
            state.pot += state.minimumBet;
            recordActivity(state, player.title, `anted $${state.minimumBet}`, 'ante', { amount: -state.minimumBet });
          }
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
