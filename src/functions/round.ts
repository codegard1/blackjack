import { STARTING_BANK } from "../definitions";
import { BOTS, getCharacter, isBotId } from "../characters";
import { GameStatus } from "../enums";
import { IPlayer, IPlayerOptions } from "../interfaces";
import { BotAccountState, GameState, PlayerKey, PlayerRole, TableRules, WorkTaskId, cloneBotAccount, defaultTableRules } from "../types";
import { recordActivity } from "./activity";
import { BotMove, Rng, botWagerCount, decideBotMove } from "./botStrategy";
import {
  createDeck, getPlayerHand, getPlayerHands, getPlayerHandValue, refillDeckCards, syncDeckHands, updateHand,
} from "./deck";
import {
  allPlayers, antePlayer, betPlayer, endPlayerTurn, getPlayer, replaceRoster, setCurrentPlayer, startPlayerTurn, updatePlayer,
} from "./playerStore";
import { appendBalance, chooseTask, defaultBotAccount, defaultBotAccounts, getWorkTask, returnThreshold } from "./work";

/**
 * The turn engine shared by the reducer and settlement. Each seat plays its
 * hand against the dealer: seats take turns in order, then the dealer plays,
 * then every hand is compared with the dealer's.
 */

/**
 * A seat's role; players saved before roles existed are the human and the dealer.
 * @param player - The seat to inspect
 * @returns The seat's role, or `undefined` when there is no player
 */
export function roleOf(player: IPlayer | undefined): PlayerRole | undefined {
  if (!player) return undefined;
  return player.role ?? (player.isNPC ? 'dealer' : 'human');
}

/**
 * True when the seat is the dealer.
 * @param player - The seat to inspect
 * @returns Whether the seat's role is `dealer`
 */
export const isDealer = (player: IPlayer | undefined): boolean => roleOf(player) === 'dealer';

/**
 * True when the seat is a computer character.
 * @param player - The seat to inspect
 * @returns Whether the seat's role is `bot`
 */
export const isBot = (player: IPlayer | undefined): boolean => roleOf(player) === 'bot';

/**
 * True when the seat is the human player.
 * @param player - The seat to inspect
 * @returns Whether the seat's role is `human`
 */
export const isHuman = (player: IPlayer | undefined): boolean => roleOf(player) === 'human';

/**
 * The dealer's seat.
 * @param state - Current game state
 * @returns The dealer, or `undefined` if none is seated
 */
export function getDealer(state: GameState): IPlayer | undefined {
  return allPlayers(state.playerStore).find(isDealer);
}

/**
 * The human player's seat.
 * @param state - Current game state
 * @returns The human player, or `undefined` if none is seated
 */
export function getHuman(state: GameState): IPlayer | undefined {
  return allPlayers(state.playerStore).find(isHuman);
}

/**
 * Seats that play against the dealer, in turn order.
 * @param state - Current game state
 * @returns Every seat except the dealer
 */
export function playerSeats(state: GameState): IPlayer[] {
  return allPlayers(state.playerStore).filter((player) => !isDealer(player));
}

/**
 * Every seat in turn order, the dealer last.
 * @param state - Current game state
 * @returns Seat keys in turn order
 */
export function seatOrder(state: GameState): PlayerKey[] {
  const dealer = getDealer(state);
  return [...playerSeats(state).map((player) => player.key), ...(dealer ? [dealer.key] : [])];
}

/**
 * Where the seats that are not on the stage wait, both lists in the reverse of turn order: the
 * dealer, who plays last, comes first, and the first to play comes last. Seats still to play wait
 * above the stage, the next to play last in its list so it is closest to the stage. A seat that
 * has played sits below the stage, the one that played most recently first, so it is closest to
 * the stage and the first to play ends at the bottom. When the round is over every seat has played.
 * A seat in control that the user has not brought to the stage still counts as waiting.
 * @param turnOrder every seat in turn order, the dealer last
 * @param onStage the seat on the stage, which waits nowhere
 * @param inControl the seat whose turn it is, if a hand is in play
 * @param isRoundOver true once every hand has a result
 * @param stillWaiting a seat to keep waiting although the round is over, while its card turns over
 * @returns The keys of the seats `waiting` above the stage and those that have `played` below it
 */
export function seatQueues(
  turnOrder: PlayerKey[],
  onStage: PlayerKey | undefined,
  inControl: PlayerKey | undefined,
  isRoundOver: boolean,
  stillWaiting?: PlayerKey,
): { waiting: PlayerKey[]; played: PlayerKey[] } {
  const controlIndex = !isRoundOver && inControl ? turnOrder.indexOf(inControl) : -1;
  const hasPlayed = (key: PlayerKey) => key !== stillWaiting && (isRoundOver || (controlIndex >= 0 && turnOrder.indexOf(key) < controlIndex));
  const others = turnOrder.filter((key) => key !== onStage);
  return {
    waiting: others.filter((key) => !hasPlayed(key)).reverse(),
    played: others.filter(hasPlayed).reverse(),
  };
}

/**
 * True when the seat was dealt into the current round.
 * @param state - Current game state
 * @param player - The seat to check
 * @returns Whether the seat is not sitting out and holds at least one card
 */
export function hasHand(state: GameState, player: IPlayer): boolean {
  return !player.isSittingOut && getPlayerHands(state.deck, player.key).some((hand) => hand.cards.length > 0);
}

/**
 * Amount a player has put on the table this round (ante plus wagers).
 * @param state - Current game state
 * @param key - Key of the seat
 * @returns The ante plus total wagers, or 0 for an unknown seat
 */
export function roundStake(state: GameState, key: PlayerKey): number {
  const player = getPlayer(state.playerStore, key);
  return (player?.lastAnte ?? 0) + (player?.totalBet ?? 0);
}

/**
 * True when the given player may double down: it is their turn in a live
 * round, they are not the dealer, they hold exactly two cards, and they can
 * cover their stake.
 * @param state - Current game state
 * @param playerKey - Key of the seat asking to double down
 * @param handIndex - Which of the seat's hands to check; defaults to the active hand
 * @returns Whether doubling down is allowed
 */
export function canDoubleDown(state: GameState, playerKey: PlayerKey, handIndex = state.activeHandIndex): boolean {
  const player = getPlayer(state.playerStore, playerKey);
  const stake = roundStake(state, playerKey);
  const hand = getPlayerHand(state.deck, playerKey, handIndex);
  return !!player
    && !isDealer(player)
    && state.gameStatus === GameStatus.InProgress
    && state.playerStore.currentPlayerKey === playerKey
    && hand?.cards.length === 2
    && !hand.isSplit
    && stake > 0
    && player.bank >= stake;
}

/**
 * A split is allowed once, on a same-rank pair, when the player can match the stake.
 * @param state - Current game state
 * @param playerKey - Key of the seat asking to split
 * @param handIndex - Which of the seat's hands to check; must be the active hand
 * @returns Whether splitting is allowed
 */
export function canSplit(state: GameState, playerKey: PlayerKey, handIndex = state.activeHandIndex): boolean {
  const player = getPlayer(state.playerStore, playerKey);
  const hand = getPlayerHand(state.deck, playerKey, handIndex);
  if (!player || isDealer(player) || state.gameStatus !== GameStatus.InProgress
    || state.playerStore.currentPlayerKey !== playerKey || handIndex !== state.activeHandIndex
    || !hand || hand.isSplit || hand.cards.length !== 2) return false;
  const rank = (card: string) => card.split('_')[1];
  const stake = roundStake(state, playerKey);
  return rank(hand.cards[0]) === rank(hand.cards[1]) && stake > 0 && player.bank >= stake;
}

/**
 * The move for the computer seat in control. The dealer follows the active
 * table rules; a computer character plays to its stats, against the
 * dealer's face-up card.
 * @param state - Current game state
 * @param key - Key of the computer seat in control
 * @param rng - Random source for the character's decisions
 * @param handIndex - Which of the seat's hands to play; defaults to the active hand
 * @returns The chosen move
 */
export function decideSeatMove(state: GameState, key: PlayerKey, rng: Rng = Math.random, handIndex = state.activeHandIndex): BotMove {
  const player = getPlayer(state.playerStore, key);
  const cards = getPlayerHand(state.deck, key, handIndex)?.cards ?? [];
  const stats = isBot(player) ? getCharacter(key)?.stats : undefined;
  if (!stats) {
    const value = getPlayerHandValue(state.deck, key, handIndex);
    const hitSoft17 = isDealer(player) && state.tableRules.dealerSoft17 === 'hit'
      && value.highest === 17 && value.aceAsOne !== value.highest;
    return value.highest < 17 || hitSoft17 ? 'hit' : 'stay';
  }

  const dealer = getDealer(state);
  // the dealer's first card is the hole card; the second is face up
  const dealerUpCard = dealer ? state.deck.playerHands[dealer.key]?.cards[1] : undefined;
  return decideBotMove({
    cards, dealerUpCard, stats, lossStreak: player?.lossStreak,
    canDouble: canDoubleDown(state, key, handIndex), canSplit: canSplit(state, key, handIndex),
    tableRules: state.tableRules, rng,
  });
}

/**
 * Hand control to a seat, ending the previous seat's turn and starting the new one.
 * @param state - Current game state
 * @param key - Key of the seat to take control
 * @returns A new state with that seat in control
 */
export function setControl(state: GameState, key: PlayerKey): GameState {
  let playerStore = state.playerStore;
  const previous = state.controllingPlayer;
  if (previous && previous !== key && getPlayer(playerStore, previous)) {
    playerStore = endPlayerTurn(playerStore, previous);
  }
  playerStore = startPlayerTurn(setCurrentPlayer(playerStore, key), key);
  return {
    ...state,
    controllingPlayer: key,
    dealerHasControl: isDealer(getPlayer(playerStore, key)),
    playerStore,
  };
}

/**
 * Index of the seat's next hand that still has to play.
 * @param state - Current game state
 * @param player - The seat to search
 * @param fromIndex - First hand index to consider
 * @returns The hand index, or -1 if no hand is left to play
 */
function playableHandIndex(state: GameState, player: IPlayer, fromIndex = 0): number {
  return getPlayerHands(state.deck, player.key).findIndex((hand, index) => index >= fromIndex
    && hand.cards.length > 0 && !hand.result && !hand.isStaying && !hand.isBusted);
}

/**
 * Pass control to the next seat that still has a hand to play, after `fromKey`
 * (or from the first seat when omitted). When every seat is done, the dealer
 * plays if any hand is still waiting on the dealer's total; otherwise the
 * round ends without the dealer drawing.
 * @param state - Current game state
 * @param fromKey - Seat that just played; omit to start from the first seat
 * @param fromHandIndex - Hand that just played; the seat's later hands are tried first
 * @returns A new state with the next seat in control, or the settled state if the round ended
 */
export function advanceTurn(state: GameState, fromKey?: PlayerKey, fromHandIndex = state.activeHandIndex): GameState {
  const seats = playerSeats(state);
  if (fromKey !== undefined) {
    const sameSeat = getPlayer(state.playerStore, fromKey);
    const nextHandIndex = sameSeat ? playableHandIndex(state, sameSeat, fromHandIndex + 1) : -1;
    if (sameSeat && nextHandIndex >= 0) {
      return setControl({ ...state, activeHandIndex: nextHandIndex }, fromKey);
    }
  }

  const start = fromKey === undefined ? 0 : seats.findIndex((player) => player.key === fromKey) + 1;
  for (const nextSeat of seats.slice(start)) {
    const handIndex = playableHandIndex(state, nextSeat);
    if (handIndex >= 0) {
      return setControl({ ...state, activeHandIndex: handIndex }, nextSeat.key);
    }
  }

  const dealer = getDealer(state);
  const waitingOnDealer = seats.some((player) => getPlayerHands(state.deck, player.key).some((hand) => hand.cards.length && !hand.result));
  if (dealer && waitingOnDealer) {
    return setControl({ ...state, activeHandIndex: playableHandIndex(state, dealer) }, dealer.key);
  }
  return resolveShowdown(state);
}

/**
 * After the deal, flag natural blackjacks. A dealer natural ends the round at
 * once: player naturals push and every other hand loses. Otherwise a player
 * natural wins the table's blackjack payout and that seat skips its turn.
 * @param state - Current game state, just after the deal
 * @returns A new state with naturals flagged, either ended or advanced to the first turn
 */
export function resolveNaturals(state: GameState): GameState {
  let playerStore = state.playerStore;
  let deck = state.deck;

  for (const player of allPlayers(playerStore)) {
    const hand = getPlayerHand(deck, player.key);
    const isBlackjack = hasHand(state, player) && hand?.cards.length === 2 && getPlayerHandValue(deck, player.key).highest === 21;
    playerStore = updatePlayer(playerStore, player.key, (p) => ({
      ...p,
      isBlackjack,
      ...(hand && isBlackjack ? { result: 'blackjack' as const } : {}),
    }));
    if (hand) {
      const stake = isDealer(player) ? 0 : roundStake(state, player.key);
      deck = updateHand(deck, player.key, 0, (h) => ({
        ...h,
        stake,
        isBlackjack,
        result: isBlackjack ? 'blackjack' : undefined,
      }));
    }
  }

  let next: GameState = { ...state, playerStore, deck };
  const dealer = getDealer(next);
  if (dealer?.isBlackjack) {
    const seats = playerSeats(next).filter((player) => hasHand(next, player));
    for (const player of seats) {
      const count = getPlayerHands(next.deck, player.key).length;
      for (let handIndex = 0; handIndex < count; handIndex++) {
        deck = updateHand(deck, player.key, handIndex, (h) => ({
          ...h,
          result: h.isBlackjack ? 'push' : 'loss',
        }));
      }
    }
    next = { ...next, deck };
    return finishRound(next);
  }

  return advanceTurn(next);
}

/**
 * Compare every hand still in play with the dealer's, then end the round.
 * Hands that already have a result (busts and naturals) keep it.
 * @param state - Current game state once every seat has played
 * @returns A new state with every hand resolved and the round over
 */
export function resolveShowdown(state: GameState): GameState {
  const dealer = getDealer(state);
  const dealerTotal = dealer ? getPlayerHandValue(state.deck, dealer.key).highest : 0;
  const dealerBusted = !dealer || dealerTotal > 21;

  let deck = state.deck;
  for (const player of playerSeats(state).filter((p) => hasHand(state, p))) {
    const hands = getPlayerHands(deck, player.key);
    hands.forEach((hand, handIndex) => {
      if (!hand.cards.length || hand.result) return;
      const total = getPlayerHandValue(deck, player.key, handIndex).highest;
      const result = dealerBusted || total > dealerTotal ? 'win' : total === dealerTotal ? 'push' : 'loss';
      deck = updateHand(deck, player.key, handIndex, (h) => ({ ...h, result }));
    });
  }
  return finishRound({ ...state, deck });
}

/**
 * Bank change for a hand with the given result and stake, stake included.
 * @param result - The hand's result
 * @param stake - Amount staked on the hand
 * @param payout - Table's blackjack payout ratio; defaults to the default table rules
 * @returns The net change: a payout for a win or blackjack, minus the stake for a loss, otherwise 0
 */
export function netFor(result: IPlayer['result'], stake: number, payout: TableRules['blackjackPayout'] = defaultTableRules.blackjackPayout): number {
  switch (result) {
    case 'blackjack': return Math.floor(stake * (payout === '6:5' ? 1.2 : 1.5));
    case 'win': return stake;
    case 'loss': return -stake;
    default: return 0;
  }
}

/**
 * Work out what each hand is worth and end the round. The dealer's result is
 * the house's net: up, down or even. Money moves when the round is settled.
 * @param state - Current game state with every hand's result set
 * @returns A new state with each seat's net and result recorded and the status set to round over
 */
export function finishRound(state: GameState): GameState {
  const dealer = getDealer(state);
  let playerStore = state.playerStore;
  let dealerNet = 0;

  for (const player of playerSeats(state)) {
    const hands = getPlayerHands(state.deck, player.key).filter((hand) => hand.result);
    if (hands.length === 0) continue;
    const net = hands.reduce((total, hand) => total + netFor(hand.result, hand.stake ?? roundStake(state, player.key), state.tableRules.blackjackPayout), 0);
    const results = hands.map((hand) => hand.result);
    const result = results.every((item) => item === results[0])
      ? results[0]
      : net > 0 ? 'win' : net < 0 ? 'loss' : 'push';
    const isBusted = hands.every((hand) => hand.isBusted);
    const isBlackjack = hands.some((hand) => hand.isBlackjack);
    const lossStreak = net < 0 ? (player.lossStreak ?? 0) + 1 : net > 0 ? 0 : player.lossStreak;
    dealerNet -= net;
    playerStore = updatePlayer(playerStore, player.key, (p) => ({
      ...p,
      net,
      result,
      isBusted,
      isStaying: true,
      isBlackjack,
      ...(lossStreak !== undefined ? { lossStreak } : {}),
    }));
  }

  if (dealer) {
    const dealerResult = dealerNet > 0 ? 'win' : dealerNet < 0 ? 'loss' : 'push';
    playerStore = updatePlayer(playerStore, dealer.key, (p) => ({
      ...p,
      net: dealerNet,
      result: dealerResult,
    }));
  }

  for (const player of allPlayers(playerStore)) {
    if (player.turn) playerStore = endPlayerTurn(playerStore, player.key);
  }

  return {
    ...state,
    playerStore,
    gameStatus: GameStatus.RoundOver,
    controllingPlayer: undefined,
    dealerHasControl: false,
  };
}

/**
 * Read a computer character's account, falling back to a default anchored at their seated bank.
 * @param state - Current game state
 * @param key - Key of the computer character
 * @returns The stored account, or a default one
 */
export function getBotAccount(state: GameState, key: PlayerKey): BotAccountState {
  const existing = state.botAccounts?.[key];
  if (existing) return existing;
  const seatedBank = getPlayer(state.playerStore, key)?.bank ?? STARTING_BANK;
  return defaultBotAccount(seatedBank);
}

/**
 * Update a computer character's account immutably, preserving unchanged slices.
 * @param state - Current game state
 * @param key - Key of the computer character
 * @param updater - Pure function mapping the existing account to its replacement
 * @returns A new state, or `state` unchanged if the account exists and `updater` returns it as is
 */
export function updateBotAccount(
  state: GameState,
  key: PlayerKey,
  updater: (account: BotAccountState) => BotAccountState,
): GameState {
  const existing = state.botAccounts?.[key];
  const base = existing ?? getBotAccount(state, key);
  const next = updater(base);
  if (existing && next === existing) return state;
  return {
    ...state,
    botAccounts: {
      ...(state.botAccounts ?? defaultBotAccounts()),
      [key]: next,
    },
  };
}

/**
 * Copy of an account with its work cleared, so the character is back at the table.
 * @param account - The account to clear
 * @returns The account without `work` or `taskOverride`
 */
function clearBotWork(account: BotAccountState): BotAccountState {
  return {
    bank: account.bank,
    balanceHistory: account.balanceHistory,
    ...(account.allowReturn !== undefined ? { allowReturn: account.allowReturn } : {}),
  };
}

/**
 * Copy of an account with its task override replaced.
 * @param account - The account to copy
 * @param taskOverride - The task to prefer, or `undefined` to remove the override
 * @returns The account with the new override
 */
function withTaskOverride(account: BotAccountState, taskOverride: WorkTaskId | undefined): BotAccountState {
  return {
    bank: account.bank,
    balanceHistory: account.balanceHistory,
    ...(account.work ? { work: account.work } : {}),
    ...(taskOverride !== undefined ? { taskOverride } : {}),
    ...(account.allowReturn !== undefined ? { allowReturn: account.allowReturn } : {}),
  };
}

/**
 * Copy a computer character's bank and away-working flags onto their seat at the table, if seated.
 * @param state - Current game state
 * @param key - Key of the computer character
 * @returns A new state, or `state` unchanged if the seat is missing or already matches the account
 */
export function syncSeatWithAccount(state: GameState, key: PlayerKey): GameState {
  const player = getPlayer(state.playerStore, key);
  const account = state.botAccounts?.[key];
  if (!player || !isBot(player) || !account) return state;

  const isSittingOut = !!account.work;
  const awayTask = account.work?.taskId;
  const isReadyToReturn = account.work?.status === 'ready';
  if (
    player.bank === account.bank
    && player.isSittingOut === isSittingOut
    && player.awayTask === awayTask
    && player.isReadyToReturn === isReadyToReturn
  ) {
    return state;
  }

  return {
    ...state,
    playerStore: updatePlayer(state.playerStore, key, (p) => ({
      ...p,
      bank: account.bank,
      isSittingOut,
      awayTask,
      isReadyToReturn,
    })),
  };
}

/**
 * Advance every away character's work by one day (24 hours = one hand).
 * Runs for all computer characters, whether or not they are currently in the roster.
 * @param state - Current game state
 * @returns A new state with work progressed, wages paid, and returns and task changes logged
 */
export function advanceWork(state: GameState): GameState {
  let next = state;
  for (const bot of BOTS) {
    next = updateBotAccount(next, bot.id, (acc) => acc);
    const account = next.botAccounts[bot.id];
    if (!account.work) continue;

    if (account.work.status === 'ready') {
      if (account.allowReturn) {
        const bank = account.bank;
        next = updateBotAccount(next, bot.id, clearBotWork);
        next = syncSeatWithAccount(next, bot.id);
        next = recordActivity(next, bot.name, `returned to the table with $${bank}`, 'work');
      } else {
        next = syncSeatWithAccount(next, bot.id);
      }
      continue;
    }

    const task = getWorkTask(account.work.taskId);
    const daysWorked = account.work.daysWorked + 1;
    if (daysWorked < task.days) {
      next = updateBotAccount(next, bot.id, (acc) => ({
        ...acc,
        work: { status: 'working', taskId: task.id, daysWorked },
      }));
      next = syncSeatWithAccount(next, bot.id);
      continue;
    }

    // Payday: the task is finished
    const paidBank = account.bank + task.pay;
    next = updateBotAccount(next, bot.id, (acc) => ({
      ...acc,
      bank: paidBank,
      balanceHistory: appendBalance(acc.balanceHistory, paidBank),
    }));
    next = recordActivity(next, bot.name, `finished ${task.label.toLowerCase()} and earned $${task.pay}`, 'work', { amount: task.pay });

    const threshold = returnThreshold(bot.stats, next.minimumBet);
    if (paidBank >= threshold) {
      if (account.allowReturn) {
        next = updateBotAccount(next, bot.id, clearBotWork);
        next = recordActivity(next, bot.name, `returned to the table with $${paidBank}`, 'work');
      } else {
        next = updateBotAccount(next, bot.id, (acc) => ({
          ...acc,
          work: { status: 'ready', taskId: task.id, daysWorked: task.days },
        }));
        next = recordActivity(next, bot.name, `has $${paidBank} and wants back in`, 'work');
      }
    } else {
      const nextTaskId = account.taskOverride ?? chooseTask(bot.stats, paidBank, threshold);
      const nextTask = getWorkTask(nextTaskId);
      next = updateBotAccount(next, bot.id, (acc) => ({
        ...acc,
        work: { status: 'working', taskId: nextTaskId, daysWorked: 0 },
      }));
      next = recordActivity(next, bot.name, `started ${nextTask.label.toLowerCase()}`, 'work');
    }

    next = syncSeatWithAccount(next, bot.id);
  }
  return next;
}

/**
 * Every seat but the dealer antes the minimum. Away characters advance their work
 * by a day first. A computer player at the table who cannot cover the ante leaves
 * to work; the human always plays, staked or not. Computer players then add wagers
 * according to their aggression.
 * @param state - Current game state at the start of a round
 * @param rng - Random source for the computer players' wagers
 * @returns A new state with antes and wagers moved into the pot
 */
export function collectAntes(state: GameState, rng: () => number = () => Math.random()): GameState {
  let next = advanceWork(state);

  for (const player of playerSeats(next)) {
    if (isBot(player)) {
      const currentBank = player.bank;
      // Keep the account bank aligned if the seat's bank was set directly
      next = updateBotAccount(next, player.key, (acc) => (
        acc.bank === currentBank ? acc : { ...acc, bank: currentBank }
      ));
      const account = next.botAccounts[player.key];
      if (account.work) {
        next = syncSeatWithAccount(next, player.key);
        continue;
      }
    }

    if (player.isSittingOut && !isBot(player)) {
      next = recordActivity(next, player.title, 'sat out', 'ante');
      continue;
    }

    const { store, paid } = antePlayer(next.playerStore, player.key, next.minimumBet);
    if (paid) {
      const playerStore = updatePlayer(store, player.key, (p) => ({ ...p, isSittingOut: false }));
      next = {
        ...next,
        playerStore,
        pot: next.pot + next.minimumBet,
      };
      if (isBot(player)) {
        const updatedBank = getPlayer(next.playerStore, player.key)!.bank;
        next = updateBotAccount(next, player.key, (acc) => (
          acc.bank === updatedBank ? acc : { ...acc, bank: updatedBank }
        ));
      }
      next = recordActivity(next, player.title, `anted $${next.minimumBet}`, 'ante', { amount: -next.minimumBet });
    } else if (isBot(player)) {
      const currentBank = player.bank;
      const existingAccount = next.botAccounts[player.key];
      const stats = getCharacter(player.key)?.stats;
      const threshold = returnThreshold(stats, next.minimumBet);
      const taskId = existingAccount.taskOverride ?? chooseTask(stats, currentBank, threshold);
      const task = getWorkTask(taskId);
      next = updateBotAccount(next, player.key, (acc) => ({
        ...acc,
        bank: currentBank,
        work: { status: 'working', taskId, daysWorked: 0 },
      }));
      next = syncSeatWithAccount(next, player.key);
      next = recordActivity(next, player.title, `left to work: ${task.label.toLowerCase()}`, 'work');
    }
  }

  for (const player of playerSeats(next).filter((p) => isBot(p) && !p.isSittingOut)) {
    const stats = getCharacter(player.key)?.stats;
    if (!stats) continue;
    const count = botWagerCount(stats, player.lossStreak, rng);
    for (let i = 0; i < count; i++) {
      const { store, paid } = betPlayer(next.playerStore, player.key, next.minimumBet);
      if (!paid) break;
      const updatedBank = getPlayer(store, player.key)!.bank;
      next = {
        ...next,
        playerStore: store,
        pot: next.pot + next.minimumBet,
      };
      next = updateBotAccount(next, player.key, (acc) => (
        acc.bank === updatedBank ? acc : { ...acc, bank: updatedBank }
      ));
      next = recordActivity(next, player.title, `wagered $${next.minimumBet}`, 'bet', { amount: -next.minimumBet });
    }
  }

  return next;
}

/**
 * Override a computer character's work task or toggle whether they return when ready.
 * If the character is already ready to return and the table is between hands (or before
 * a game starts), enabling allowReturn brings them back at once.
 * @param state - Current game state
 * @param playerKey - Key of the computer character
 * @param options - Changes to apply
 * @param options.taskOverride - Task to prefer, or `null` to remove the override
 * @param options.allowReturn - Whether the character may return to the table when ready
 * @returns A new state, or `state` unchanged if `playerKey` is not a computer character
 */
export function configureCharacterWork(
  state: GameState,
  playerKey: PlayerKey,
  options: { taskOverride?: WorkTaskId | null; allowReturn?: boolean },
): GameState {
  if (!isBotId(playerKey)) return state;
  let next = updateBotAccount(state, playerKey, (acc) => acc);
  const character = getCharacter(playerKey);

  if (options.taskOverride !== undefined) {
    const nextOverride = options.taskOverride === null ? undefined : options.taskOverride;
    next = updateBotAccount(next, playerKey, (acc) => withTaskOverride(acc, nextOverride));
    const account = getBotAccount(next, playerKey);
    if (account.work?.status === 'working') {
      const threshold = returnThreshold(character?.stats, next.minimumBet);
      const chosen = account.taskOverride ?? chooseTask(character?.stats, account.bank, threshold);
      if (chosen !== account.work.taskId) {
        next = updateBotAccount(next, playerKey, (acc) => ({
          ...acc,
          work: { status: 'working', taskId: chosen, daysWorked: 0 },
        }));
        const task = getWorkTask(chosen);
        next = recordActivity(next, character?.name ?? playerKey, `switched work to ${task.label.toLowerCase()}`, 'work');
      }
    }
  }

  if (options.allowReturn !== undefined) {
    const allowReturn = options.allowReturn;
    next = updateBotAccount(next, playerKey, (acc) => ({ ...acc, allowReturn }));
    const account = getBotAccount(next, playerKey);
    if (account.allowReturn && account.work?.status === 'ready' && (next.gameStatus === GameStatus.Init || isBetweenHands(next))) {
      const bank = account.bank;
      next = updateBotAccount(next, playerKey, clearBotWork);
      next = recordActivity(next, character?.name ?? playerKey, `returned to the table with $${bank}`, 'work');
    }
  }

  return syncSeatWithAccount(next, playerKey);
}

/**
 * Mid-round, when the deck cannot cover a draw: shuffle every card that is not
 * in someone's hand into a fresh deck, so play can carry on.
 * @param state - Current game state
 * @param rng - Random source for shuffling
 * @returns A new state with a refilled deck and a logged shuffle
 */
export function refillDeck(state: GameState, rng: () => number = () => Math.random()): GameState {
  return recordActivity({
    ...state,
    deck: refillDeckCards(state.deck, Number(state.tableRules.numberOfDecks), rng),
  }, '', 'Deck shuffled', 'shuffle');
}

/** Cards each seat may need in a round; the deck is rebuilt when fewer remain */
const CARDS_PER_SEAT = 6;

/**
 * Rebuild and shuffle the deck between rounds when it is running low.
 * @param state - Current game state
 * @param rng - Random source for shuffling
 * @returns A new state with a fresh deck, or `state` unchanged if enough cards remain
 */
export function reshuffleIfLow(state: GameState, rng: () => number = () => Math.random()): GameState {
  const players = allPlayers(state.playerStore);
  const numberOfDecks = Number(state.tableRules.numberOfDecks);
  if (state.deck.cardKeys.length >= players.length * CARDS_PER_SEAT * numberOfDecks) return state;
  return recordActivity({
    ...state,
    deck: syncDeckHands(createDeck(numberOfDecks, rng), players.map((player) => player.key)),
  }, '', 'Deck shuffled', 'shuffle');
}

/**
 * True between hands: the round is over and has been settled.
 * @param state - Current game state
 * @returns Whether the round is over and settled
 */
export function isBetweenHands(state: GameState): boolean {
  return state.gameStatus >= GameStatus.RoundOver && state.gameStatusFlag;
}

/**
 * The seat keys of a roster, in seating order; two rosters match when their signatures do.
 * @param seats - Seats in seating order
 * @returns The seat keys joined with `|`
 */
export const rosterSignature = (seats: { key: PlayerKey }[]): string => seats.map((seat) => seat.key).join('|');

/**
 * Change who sits at the table, but only between hands; while a hand is in play the
 * new roster is ignored. Seats that stay keep their bank and stats, seats that leave
 * are removed, and new seats join with their persistent bank (for computer characters)
 * or a fresh bank. Seating follows the roster order.
 * @param state - Current game state
 * @param seats - The new roster, in seating order
 * @param botAccounts - Persisted computer character accounts to adopt for any not already known
 * @returns A new state with the roster applied, or `state` unchanged if a hand is in play or the roster is empty
 */
export function applyRoster(
  state: GameState,
  seats: IPlayerOptions[],
  botAccounts?: Record<string, BotAccountState>,
): GameState {
  if (!isBetweenHands(state) || seats.length === 0) return state;

  let next = state;
  if (botAccounts) {
    let updatedAccounts: Record<string, BotAccountState> | undefined;
    for (const [id, incoming] of Object.entries(botAccounts)) {
      if (!next.botAccounts[id]) {
        updatedAccounts ??= { ...next.botAccounts };
        updatedAccounts[id] = cloneBotAccount(incoming);
      }
    }
    if (updatedAccounts) {
      next = { ...next, botAccounts: updatedAccounts };
    }
  }

  if (rosterSignature(seats) === rosterSignature(allPlayers(next.playerStore))) return next;

  const previous = next.playerStore.players;
  const enrichedSeats = seats.map((seat) => {
    if (previous[seat.key]) return seat;
    const account = isBotId(seat.key) ? next.botAccounts[seat.key] : undefined;
    return account ? {
      ...seat,
      bank: account.bank,
      isSittingOut: !!account.work,
      awayTask: account.work?.taskId,
      isReadyToReturn: account.work?.status === 'ready',
    } : seat;
  });
  const store = replaceRoster(next.playerStore, enrichedSeats);

  const joined = seats.filter((seat) => !previous[seat.key]).map((seat) => seat.title);
  const left = Object.values(previous).filter((player) => !store.players[player.key]).map((player) => player.title);

  const deck = syncDeckHands(next.deck, seats.map((seat) => seat.key));
  const controllingPlayer = next.controllingPlayer && !store.players[next.controllingPlayer] ? undefined : next.controllingPlayer;
  const winner = next.winner && !store.players[next.winner] ? undefined : next.winner;
  const loser = next.loser && !store.players[next.loser] ? undefined : next.loser;

  const changes = [joined.length ? `${joined.join(', ')} joined` : '', left.length ? `${left.join(', ')} left` : ''].filter(Boolean);
  return recordActivity({
    ...next,
    deck,
    playerStore: store,
    controllingPlayer,
    winner,
    loser,
  }, '', `Players changed: ${changes.join('; ') || 'seating order'}`, 'round');
}

