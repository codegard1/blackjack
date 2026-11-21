import { GameStatus } from "../enums";
import { IPlayer } from "../interfaces";
import { GameState } from "../types";
import { recordActivity } from "./activity";
import { getPlayerHands, updateHand } from "./deck";
import { advancePlayer, allPlayers, payoutPlayer, updatePlayerStats } from "./playerStore";
import { collectAntes, isDealer, netFor, roundStake } from "./round";

export { roundStake } from "./round";

/** How a settled hand reads in the activity log */
export function describeResult(player: IPlayer): string {
  const net = player.net ?? 0;
  if (isDealer(player)) {
    return net > 0 ? `took $${net}` : net < 0 ? `paid out $${-net}` : 'broke even';
  }
  switch (player.result) {
    case 'blackjack': return `won $${net} with blackjack`;
    case 'win': return `won $${net}`;
    case 'push': return 'push, stake returned';
    case 'loss': return player.isBusted ? `busted, lost $${-net}` : `lost $${-net}`;
    default: return '';
  }
}

function activityEvent(player: IPlayer): 'win' | 'loss' | 'push' {
  if (player.result === 'blackjack' || player.result === 'win') return 'win';
  return player.result === 'loss' ? 'loss' : 'push';
}

/**
 * Pay out a finished round, then record stats. Each hand was settled against
 * the dealer when the round ended (see finishRound): a win pays even money,
 * a natural blackjack pays the table rate, a push returns the stake, and the dealer
 * keeps a losing stake. The dealer's bank takes the other side of every hand.
 * Guarded by gameStatusFlag so a round is never settled twice.
 */
function settleRound(state: GameState): void {
  if (state.gameStatusFlag) return;

  allPlayers(state.playerStore).filter((player) => !isDealer(player)).forEach((player) => {
    const hands = getPlayerHands(state.deck, player.key);
    hands.forEach((hand, index) => {
      if (!hand.result) return;
      const stake = hand.stake ?? roundStake(state, player.key);
      const net = hand.net ?? netFor(hand.result, stake, state.tableRules.blackjackPayout);
      state.deck = updateHand(state.deck, player.key, index, (h) => ({ ...h, net }));
      const amount = Math.max(0, stake + net);
      if (amount !== 0) state.playerStore = payoutPlayer(state.playerStore, player.key, amount);
      const handPlayer = {
        ...player,
        result: hand.result,
        isBusted: hand.isBusted,
        isBlackjack: hand.isBlackjack,
        net,
      };
      const label = hands.length > 1 ? `${player.title} (hand ${index + 1})` : player.title;
      recordActivity(state, label, describeResult(handPlayer), activityEvent(handPlayer), { amount });

      const won = hand.result === 'win' || hand.result === 'blackjack';
      state.playerStore = updatePlayerStats(state.playerStore, player.key, {
        numberOfGamesLost: hand.result === 'loss' ? 1 : 0,
        numberOfGamesPlayed: 1,
        numberOfGamesWon: won ? 1 : 0,
        numberOfTimesBlackjack: hand.isBlackjack ? 1 : 0,
        numberOfTimesBusted: hand.isBusted ? 1 : 0,
        totalWinnings: Math.max(0, net),
        netResult: net,
        winLossRatio: 0,
      });
    });
  });

  const dealer = allPlayers(state.playerStore).find(isDealer);
  if (dealer?.result) {
    const net = dealer.net ?? 0;
    if (net !== 0) state.playerStore = payoutPlayer(state.playerStore, dealer.key, net);
    recordActivity(state, dealer.title, describeResult(dealer), activityEvent(dealer), { amount: net });
    state.playerStore = updatePlayerStats(state.playerStore, dealer.key, {
      numberOfGamesLost: dealer.result === 'loss' ? 1 : 0,
      numberOfGamesPlayed: 1,
      numberOfGamesWon: dealer.result === 'win' ? 1 : 0,
      numberOfTimesBlackjack: dealer.isBlackjack ? 1 : 0,
      numberOfTimesBusted: dealer.isBusted ? 1 : 0,
      totalWinnings: Math.max(0, net),
      netResult: net,
      winLossRatio: 0,
    });
  }

  state.gameStatusFlag = true;
}

/**
 * Apply status-driven bookkeeping to the game state.
 *
 * Starts a game's ante, advances to the next player, settles completed rounds,
 * or resets a game-over status. The supplied state is updated and returned.
 *
 * @param state Current game state to evaluate.
 * @returns The updated game state.
 */
export function evaluateGame(state: GameState, rng: () => number = () => Math.random()): GameState {
  switch (state.gameStatus) {
    case GameStatus.InProgress:
      /* First play of a new game: every player antes the minimum */
      if (state.turnCount === 0) {
        state.pot = 0;
        collectAntes(state, rng);
        state.turnCount = 1;
      }
      break;

    case GameStatus.NextTurn:
      if (!state.gameStatusFlag) {
        state.playerStore = advancePlayer(state.playerStore);
        state.gameStatus = GameStatus.InProgress;
      }
      break;

    case GameStatus.RoundOver:
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
