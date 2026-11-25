import { GameStatus } from "../../shared";
import { IPlayer } from "../../shared/IPlayer";
import { GameState } from "../../shared";
import { recordActivity } from "./activity";
import { getPlayerHands, updateHand } from "./deck";
import { advancePlayer, allPlayers, getPlayer, payoutPlayer, updatePlayerStats } from "./playerStore";
import { collectAntes, isBot, isDealer, netFor, roundStake, updateBotAccount } from "./round";
import { recordSessionSeat } from "./session";
import { appendBalance } from "./work";

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
function settleRound(state: GameState): GameState {
  if (state.gameStatusFlag) return state;

  let next = state;
  for (const player of allPlayers(next.playerStore).filter((p) => !isDealer(p))) {
    let playedRound = false;
    let seatNet = 0;
    const hands = getPlayerHands(next.deck, player.key);
    for (let index = 0; index < hands.length; index++) {
      const hand = hands[index];
      if (!hand.result) continue;
      playedRound = true;
      const stake = hand.stake ?? roundStake(next, player.key);
      const net = hand.net ?? netFor(hand.result, stake, next.tableRules.blackjackPayout);
      seatNet += net;
      const deck = updateHand(next.deck, player.key, index, (h) => ({ ...h, net }));
      const amount = Math.max(0, stake + net);
      const playerStore = amount !== 0 ? payoutPlayer(next.playerStore, player.key, amount) : next.playerStore;
      const handPlayer = {
        ...player,
        result: hand.result,
        isBusted: hand.isBusted,
        isBlackjack: hand.isBlackjack,
        net,
      };
      const label = hands.length > 1 ? `${player.title} (hand ${index + 1})` : player.title;
      const description = hand.isSurrendered ? `surrendered, lost $${-net}` : describeResult(handPlayer);
      const event = hand.isSurrendered ? 'surrender' : activityEvent(handPlayer);
      next = recordActivity({ ...next, deck, playerStore }, label, description, event, { amount });

      const won = hand.result === 'win' || hand.result === 'blackjack';
      next = {
        ...next,
        playerStore: updatePlayerStats(next.playerStore, player.key, {
          numberOfGamesLost: hand.result === 'loss' ? 1 : 0,
          numberOfGamesPlayed: 1,
          numberOfGamesWon: won ? 1 : 0,
          numberOfTimesBlackjack: hand.isBlackjack ? 1 : 0,
          numberOfTimesBusted: hand.isBusted ? 1 : 0,
          numberOfTimesSurrendered: hand.isSurrendered ? 1 : 0,
          totalWinnings: Math.max(0, net),
          netResult: net,
          winLossRatio: 0,
        }),
      };
    }

    if (playedRound) {
      const bank = getPlayer(next.playerStore, player.key)!.bank;
      next = {
        ...next,
        session: recordSessionSeat(next.session, next.playerStore, player, getPlayerHands(next.deck, player.key), bank, seatNet),
      };
      if (isBot(player)) {
        next = updateBotAccount(next, player.key, (acc) => ({
          ...acc,
          bank,
          balanceHistory: appendBalance(acc.balanceHistory, bank),
        }));
      }
    }
  }

  const dealer = allPlayers(next.playerStore).find(isDealer);
  if (dealer?.result) {
    const net = dealer.net ?? 0;
    const playerStore = net !== 0 ? payoutPlayer(next.playerStore, dealer.key, net) : next.playerStore;
    next = recordActivity({ ...next, playerStore }, dealer.title, describeResult(dealer), activityEvent(dealer), { amount: net });
    next = {
      ...next,
      playerStore: updatePlayerStats(next.playerStore, dealer.key, {
        numberOfGamesLost: dealer.result === 'loss' ? 1 : 0,
        numberOfGamesPlayed: 1,
        numberOfGamesWon: dealer.result === 'win' ? 1 : 0,
        numberOfTimesBlackjack: dealer.isBlackjack ? 1 : 0,
        numberOfTimesBusted: dealer.isBusted ? 1 : 0,
        totalWinnings: Math.max(0, net),
        netResult: net,
        winLossRatio: 0,
      }),
    };
  }

  return {
    ...next,
    gameStatusFlag: true,
  };
}

/**
 * Apply status-driven bookkeeping to the game state.
 *
 * Starts a game's ante, advances to the next player, settles completed rounds,
 * or resets a game-over status, returning the updated state without mutating
 * the input.
 *
 * @param state Current game state to evaluate.
 * @returns The updated game state.
 */
export function evaluateGame(state: GameState, rng: () => number = () => Math.random()): GameState {
  switch (state.gameStatus) {
    case GameStatus.InProgress:
      /* First play of a new game: every player antes the minimum */
      if (state.turnCount === 0) {
        return {
          ...collectAntes({ ...state, pot: 0 }, rng),
          turnCount: 1,
        };
      }
      return state;

    case GameStatus.NextTurn:
      if (!state.gameStatusFlag) {
        return {
          ...state,
          playerStore: advancePlayer(state.playerStore),
          gameStatus: GameStatus.InProgress,
        };
      }
      return state;

    case GameStatus.RoundOver:
      return settleRound(state);

    case GameStatus.GameOver:
      return {
        ...state,
        gameStatus: GameStatus.Init,
      };

    default:
      return state;
  }
}
