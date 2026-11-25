import { IPlayer } from '../../shared/IPlayer';
import { IPlayerStoreState } from '../../shared/IPlayerStore';
import { MAX_BALANCE_HISTORY } from '../../shared/Work';
import { PlayerHand, PlayerKey, SessionSeatStats, SessionSummaryState } from '../../shared';
import { allPlayers } from './playerStore';

function isNonDealer(player: IPlayer): boolean {
  return (player.role ?? (player.isNPC ? 'dealer' : 'human')) !== 'dealer';
}

function emptySeatStats(player: IPlayer): SessionSeatStats {
  return {
    title: player.title,
    hands: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    blackjacks: 0,
    busts: 0,
    net: 0,
    balanceHistory: [player.bank],
  };
}

/** Start a fresh session summary for every non-dealer seat at the table */
export function initSession(playerStore: IPlayerStoreState): SessionSummaryState {
  const seats: Record<PlayerKey, SessionSeatStats> = {};
  for (const player of allPlayers(playerStore)) {
    if (isNonDealer(player)) seats[player.key] = emptySeatStats(player);
  }
  return { seats };
}

/** Record settled hands and the resulting bank balance for one seat in the current session */
export function recordSessionSeat(
  session: SessionSummaryState | undefined,
  playerStore: IPlayerStoreState,
  player: IPlayer,
  hands: readonly PlayerHand[],
  bank: number,
  netDelta: number,
): SessionSummaryState {
  const base = session ?? initSession(playerStore);
  const existing = base.seats[player.key] ?? emptySeatStats(player);
  let { hands: count, wins, losses, pushes, blackjacks, busts } = existing;

  for (const hand of hands) {
    if (!hand.result) continue;
    count += 1;
    if (hand.result === 'win' || hand.result === 'blackjack') wins += 1;
    else if (hand.result === 'loss') losses += 1;
    else if (hand.result === 'push') pushes += 1;
    if (hand.isBlackjack) blackjacks += 1;
    if (hand.isBusted) busts += 1;
  }

  const nextHistory = [...existing.balanceHistory, bank].slice(-MAX_BALANCE_HISTORY);
  return {
    seats: {
      ...base.seats,
      [player.key]: {
        title: player.title,
        hands: count,
        wins,
        losses,
        pushes,
        blackjacks,
        busts,
        net: existing.net + netDelta,
        balanceHistory: nextHistory,
      },
    },
  };
}

export function cloneSessionSummary(session: SessionSummaryState): SessionSummaryState {
  const seats: Record<PlayerKey, SessionSeatStats> = {};
  for (const [key, seat] of Object.entries(session.seats)) {
    seats[key] = { ...seat, balanceHistory: [...seat.balanceHistory] };
  }
  return { seats };
}

const isCount = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

export function isSessionSummary(value: unknown): value is SessionSummaryState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const seats = (value as SessionSummaryState).seats;
  if (typeof seats !== 'object' || seats === null || Array.isArray(seats)) return false;
  const entries = Object.entries(seats);
  if (entries.length > 10) return false;
  return entries.every(([, seat]) => (
    typeof seat === 'object' && seat !== null && !Array.isArray(seat)
    && typeof seat.title === 'string' && seat.title.length > 0 && seat.title.length <= 40
    && isCount(seat.hands)
    && isCount(seat.wins)
    && isCount(seat.losses)
    && isCount(seat.pushes)
    && isCount(seat.blackjacks)
    && isCount(seat.busts)
    && typeof seat.net === 'number' && Number.isFinite(seat.net)
    && Array.isArray(seat.balanceHistory) && seat.balanceHistory.length <= MAX_BALANCE_HISTORY
    && seat.balanceHistory.every((v) => typeof v === 'number' && Number.isFinite(v))
  ));
}
