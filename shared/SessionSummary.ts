import type { SessionSeatStats, SessionSummaryState } from './GameState';
import type { PlayerKey } from './PlayerKey';
import { MAX_BALANCE_HISTORY } from './Work';

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
