import { PlayerStore } from "../classes/PlayerStore";
import { PlayingCard } from "../classes/PlayingCard";
import { PlayingCardDeck } from "../classes/PlayingCardDeck";
import { getCharacter } from "../characters";
import { GameStatus } from "../enums";
import { IPlayer, IPlayerOptions } from "../interfaces";
import { GameState, PlayerKey, PlayerRole } from "../types";
import { recordActivity } from "./activity";
import { BotMove, Rng, botWagerCount, decideBotMove } from "./botStrategy";
import { fisherYates } from "./fisherYates";

/**
 * The turn engine shared by the reducer and settlement. Each seat plays its
 * hand against the dealer: seats take turns in order, then the dealer plays,
 * then every hand is compared with the dealer's.
 */

/** A seat's role; players saved before roles existed are the human and the dealer */
export function roleOf(player: IPlayer | undefined): PlayerRole | undefined {
  if (!player) return undefined;
  return player.role ?? (player.isNPC ? 'dealer' : 'human');
}

export const isDealer = (player: IPlayer | undefined): boolean => roleOf(player) === 'dealer';
export const isBot = (player: IPlayer | undefined): boolean => roleOf(player) === 'bot';
export const isHuman = (player: IPlayer | undefined): boolean => roleOf(player) === 'human';

export function getDealer(state: GameState): IPlayer | undefined {
  return state.playerStore.all.find(isDealer);
}

export function getHuman(state: GameState): IPlayer | undefined {
  return state.playerStore.all.find(isHuman);
}

/** Seats that play against the dealer, in turn order */
export function playerSeats(state: GameState): IPlayer[] {
  return state.playerStore.all.filter((player) => !isDealer(player));
}

/** Every seat in turn order, the dealer last */
export function seatOrder(state: GameState): PlayerKey[] {
  const dealer = getDealer(state);
  return [...playerSeats(state).map((player) => player.key), ...(dealer ? [dealer.key] : [])];
}

/** True when the seat was dealt into the current round */
export function hasHand(state: GameState, player: IPlayer): boolean {
  return !player.isSittingOut && (state.deck.playerHands[player.key]?.cards.length ?? 0) > 0;
}

/** Amount a player has put on the table this round (ante plus wagers). */
export function roundStake(state: GameState, key: PlayerKey): number {
  const player = state.playerStore.player(key);
  return (player?.lastAnte ?? 0) + (player?.totalBet ?? 0);
}

/**
 * True when the given player may double down: it is their turn in a live
 * round, they are not the dealer, they hold exactly two cards, and they can
 * cover their stake.
 */
export function canDoubleDown(state: GameState, playerKey: PlayerKey): boolean {
  const player = state.playerStore.player(playerKey);
  const stake = roundStake(state, playerKey);
  return !!player
    && !isDealer(player)
    && state.gameStatus === GameStatus.InProgress
    && state.playerStore.currentPlayerKey === playerKey
    && state.deck.playerHands[playerKey]?.cards.length === 2
    && stake > 0
    && player.bank >= stake;
}

/**
 * The move for the computer seat in control. The dealer hits below 17 and
 * stands otherwise; a computer character plays to its stats, against the
 * dealer's face-up card.
 */
export function decideSeatMove(state: GameState, key: PlayerKey, rng: Rng = Math.random): BotMove {
  const player = state.playerStore.player(key);
  const cards = state.deck.playerHands[key]?.cards ?? [];
  const stats = isBot(player) ? getCharacter(key)?.stats : undefined;
  if (!stats) return state.deck.getHandValue(key).highest < 17 ? 'hit' : 'stay';

  const dealer = getDealer(state);
  // the dealer's first card is the hole card; the second is face up
  const dealerUpCard = dealer ? state.deck.playerHands[dealer.key]?.cards[1] : undefined;
  return decideBotMove({ cards, dealerUpCard, stats, lossStreak: player.lossStreak, canDouble: canDoubleDown(state, key), rng });
}

/** Hand control to a seat */
export function setControl(state: GameState, key: PlayerKey): void {
  const previous = state.controllingPlayer;
  if (previous && previous !== key && state.playerStore.player(previous)) state.playerStore.endTurn(previous);
  state.controllingPlayer = key;
  state.dealerHasControl = isDealer(state.playerStore.player(key));
  state.playerStore.currentPlayerKey = key;
  state.playerStore.startTurn(key);
}

/** A seat that still has to play its hand */
function isAwaitingTurn(state: GameState, player: IPlayer): boolean {
  return hasHand(state, player) && !player.result && !player.isStaying && !player.isBusted;
}

/**
 * Pass control to the next seat that still has a hand to play, after `fromKey`
 * (or from the first seat when omitted). When every seat is done, the dealer
 * plays if any hand is still waiting on the dealer's total; otherwise the
 * round ends without the dealer drawing.
 */
export function advanceTurn(state: GameState, fromKey?: PlayerKey): void {
  const seats = playerSeats(state);
  const start = fromKey === undefined ? 0 : seats.findIndex((player) => player.key === fromKey) + 1;
  const next = seats.slice(start).find((player) => isAwaitingTurn(state, player));
  if (next) {
    setControl(state, next.key);
    return;
  }

  const dealer = getDealer(state);
  const waitingOnDealer = seats.some((player) => hasHand(state, player) && !player.result);
  if (dealer && waitingOnDealer) {
    setControl(state, dealer.key);
  } else {
    resolveShowdown(state);
  }
}

/**
 * After the deal, flag natural blackjacks. A dealer natural ends the round at
 * once: player naturals push and every other hand loses. Otherwise a player
 * natural wins 3:2 and that seat skips its turn.
 */
export function resolveNaturals(state: GameState): void {
  state.playerStore.all.forEach((player) => {
    const hand = state.deck.playerHands[player.key];
    player.isBlackjack = hasHand(state, player) && hand.cards.length === 2 && state.deck.getHandValue(player.key).highest === 21;
  });

  const seats = playerSeats(state).filter((player) => hasHand(state, player));
  const dealer = getDealer(state);

  if (dealer?.isBlackjack) {
    seats.forEach((player) => { player.result = player.isBlackjack ? 'push' : 'loss'; });
    finishRound(state);
    return;
  }

  seats.filter((player) => player.isBlackjack).forEach((player) => {
    player.result = 'blackjack';
    state.playerStore.finish(player.key);
  });
  advanceTurn(state);
}

/**
 * Compare every hand still in play with the dealer's, then end the round.
 * Hands that already have a result (busts and naturals) keep it.
 */
export function resolveShowdown(state: GameState): void {
  const dealer = getDealer(state);
  const dealerTotal = dealer ? state.deck.getHandValue(dealer.key).highest : 0;
  const dealerBusted = !dealer || dealerTotal > 21;

  playerSeats(state).filter((player) => hasHand(state, player) && !player.result).forEach((player) => {
    const total = state.deck.getHandValue(player.key).highest;
    player.result = dealerBusted || total > dealerTotal ? 'win' : total === dealerTotal ? 'push' : 'loss';
  });
  finishRound(state);
}

/** Bank change for a hand with the given result and stake, stake included */
export function netFor(result: IPlayer['result'], stake: number): number {
  switch (result) {
    case 'blackjack': return Math.floor(stake * 1.5);
    case 'win': return stake;
    case 'loss': return -stake;
    default: return 0;
  }
}

/**
 * Work out what each hand is worth and end the round. The dealer's result is
 * the house's net: up, down or even. Money moves when the round is settled.
 */
export function finishRound(state: GameState): void {
  const dealer = getDealer(state);
  let dealerNet = 0;

  playerSeats(state).filter((player) => player.result).forEach((player) => {
    player.net = netFor(player.result, roundStake(state, player.key));
    dealerNet -= player.net;
    if (player.result === 'loss') player.lossStreak = (player.lossStreak ?? 0) + 1;
    else if (player.result !== 'push') player.lossStreak = 0;
  });

  if (dealer) {
    dealer.net = dealerNet;
    dealer.result = dealerNet > 0 ? 'win' : dealerNet < 0 ? 'loss' : 'push';
  }

  state.playerStore.all.forEach((player) => { if (player.turn) state.playerStore.endTurn(player.key); });
  state.gameStatus = GameStatus.RoundOver;
  state.controllingPlayer = undefined;
  state.dealerHasControl = false;
}

/**
 * Every seat but the dealer antes the minimum. A computer player who cannot
 * cover it sits the round out; the human always plays, staked or not.
 * Computer players then add wagers according to their aggression.
 */
export function collectAntes(state: GameState, rng: () => number = Math.random): void {
  playerSeats(state).forEach((player) => {
    if (state.playerStore.ante(player.key, state.minimumBet)) {
      state.pot += state.minimumBet;
      recordActivity(state, player.title, `anted $${state.minimumBet}`, 'ante', { amount: -state.minimumBet });
    } else if (isBot(player)) {
      player.isSittingOut = true;
      recordActivity(state, player.title, 'sat out: not enough money to ante', 'ante');
    }
  });

  playerSeats(state).filter((player) => isBot(player) && !player.isSittingOut).forEach((player) => {
    const stats = getCharacter(player.key)?.stats;
    if (!stats) return;
    const count = botWagerCount(stats, player.lossStreak, rng);
    for (let i = 0; i < count; i++) {
      if (!state.playerStore.bet(player.key, state.minimumBet)) break;
      state.pot += state.minimumBet;
      recordActivity(state, player.title, `wagered $${state.minimumBet}`, 'bet', { amount: -state.minimumBet });
    }
  });
}

/**
 * Mid-round, when the deck cannot cover a draw: shuffle every card that is not
 * in someone's hand into a fresh deck, so play can carry on.
 */
export function refillDeck(state: GameState): void {
  const inHands = new Set(Object.values(state.deck.playerHands).flatMap((hand) => hand.cards));
  const keys = PlayingCardDeck.cardKeys().filter((key) => !inHands.has(key));
  state.deck.cards = fisherYates(keys).map((key) => new PlayingCard(key));
  recordActivity(state, '', 'Deck shuffled', 'shuffle');
}

/** Cards each seat may need in a round; the deck is rebuilt when fewer remain */
const CARDS_PER_SEAT = 6;

/** Rebuild and shuffle the deck between rounds when it is running low */
export function reshuffleIfLow(state: GameState): void {
  const seats = state.playerStore.all.length;
  if (state.deck.length >= seats * CARDS_PER_SEAT) return;
  state.deck.reset();
  state.playerStore.all.forEach((player) => state.deck.newPlayerHand(player.key));
  recordActivity(state, '', 'Deck shuffled', 'shuffle');
}

/** True between hands: the round is over and has been settled */
export function isBetweenHands(state: GameState): boolean {
  return state.gameStatus >= GameStatus.RoundOver && state.gameStatusFlag;
}

/** The seat keys of a roster, in seating order; two rosters match when their signatures do */
export const rosterSignature = (seats: { key: PlayerKey }[]): string => seats.map((seat) => seat.key).join('|');

/**
 * Change who sits at the table, but only between hands; while a hand is in play the
 * new roster is ignored. Seats that stay keep their bank and stats, seats that leave
 * are removed, and new seats join with a fresh bank. Seating follows the roster order.
 */
export function applyRoster(state: GameState, seats: IPlayerOptions[]): void {
  if (!isBetweenHands(state) || seats.length === 0) return;
  if (rosterSignature(seats) === rosterSignature(state.playerStore.all)) return;

  const previous = state.playerStore.players;
  const store = new PlayerStore();
  seats.forEach((seat) => {
    if (previous[seat.key]) store.players[seat.key] = previous[seat.key];
    else store.newPlayer(seat);
  });
  store.currentPlayerKey = state.playerStore.currentPlayerKey && store.players[state.playerStore.currentPlayerKey]
    ? state.playerStore.currentPlayerKey
    : undefined;
  store.lastWriteTime = state.playerStore.lastWriteTime;

  const joined = seats.filter((seat) => !previous[seat.key]).map((seat) => seat.title);
  const left = Object.values(previous).filter((player) => !store.players[player.key]).map((player) => player.title);

  Object.keys(state.deck.playerHands).filter((key) => !store.players[key]).forEach((key) => delete state.deck.playerHands[key]);
  seats.forEach((seat) => { if (!state.deck.playerHands[seat.key]) state.deck.newPlayerHand(seat.key); });

  state.playerStore = store;
  if (state.controllingPlayer && !store.players[state.controllingPlayer]) state.controllingPlayer = undefined;
  if (state.winner && !store.players[state.winner]) state.winner = undefined;
  if (state.loser && !store.players[state.loser]) state.loser = undefined;
  const changes = [joined.length ? `${joined.join(', ')} joined` : '', left.length ? `${left.join(', ')} left` : ''].filter(Boolean);
  recordActivity(state, '', `Players changed: ${changes.join('; ') || 'seating order'}`, 'round');
}
