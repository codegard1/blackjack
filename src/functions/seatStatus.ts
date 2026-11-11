import { GameStatus } from "../enums";
import { IPlayer } from "../interfaces";
import { SeatStatus } from "../types";
import { isDealer } from "./round";

/** True once every hand in the round has a result */
export function isRoundOver(gameStatus: GameStatus): boolean {
  return gameStatus === GameStatus.RoundOver;
}

/**
 * True while the dealer's first card is face down: from the deal until the round
 * ends, unless the Show Dealer Hand setting turns it up sooner. Only the dealer
 * has a hole card, so this is false for every other seat.
 */
export function isHoleCardHidden(player: IPlayer | undefined, isDealerHandVisible: boolean, gameStatus: GameStatus): boolean {
  return isDealer(player) && !isDealerHandVisible && !isRoundOver(gameStatus);
}

/** True when the player came out ahead in the settled round */
export function isSeatWinner(player: IPlayer, gameStatus: GameStatus): boolean {
  return isRoundOver(gameStatus) && (player.result === 'win' || player.result === 'blackjack');
}

/** True when the player came out behind in the settled round */
export function isSeatLoser(player: IPlayer, gameStatus: GameStatus): boolean {
  return isRoundOver(gameStatus) && player.result === 'loss';
}

/**
 * The most important status for a player, or undefined when there is nothing to say.
 * Checked in priority order: result, then busted, then whose turn it is, then standing.
 * A natural blackjack shows as soon as it is dealt, since that hand is already settled.
 */
export function seatStatus(player: IPlayer, gameStatus: GameStatus): SeatStatus | undefined {
  const roundOver = isRoundOver(gameStatus);
  const isActive = !!player.turn && !roundOver;

  if (player.result === 'blackjack' || (player.result === 'win' && player.isBlackjack)) return { text: '✨ Blackjack', color: 'success', appearance: 'tint' };
  if (player.isSittingOut) return { text: 'Sitting out', color: 'subtle', appearance: 'tint' };
  if (roundOver && player.result === 'win') return { text: '🏆 Winner', color: 'success', appearance: 'tint' };
  if (roundOver && player.result === 'loss') return { text: player.isBusted ? '💥 Busted' : '💔 Loser', color: 'danger', appearance: 'tint' };
  if (roundOver && player.result === 'push') return { text: isDealer(player) ? '🤝 Even' : '🤝 Push', color: 'informative', appearance: 'tint' };
  if (player.isBusted) return { text: '💥 Busted', color: 'danger', appearance: 'tint' };
  if (isActive) return { text: player.isNPC ? 'Playing' : 'Your turn', color: 'brand', appearance: 'filled' };
  if (player.isStaying && !roundOver) return { text: 'Standing', color: 'subtle', appearance: 'tint' };
  return undefined;
}
