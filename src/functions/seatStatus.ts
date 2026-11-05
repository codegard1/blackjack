import { GameStatus } from "../enums";
import { IPlayer } from "../interfaces";
import { SeatStatus } from "../types";

/** True once the round has been settled */
export function isRoundOver(gameStatus: GameStatus): boolean {
  return gameStatus === GameStatus.HumanWins || gameStatus === GameStatus.DealerWins || gameStatus === GameStatus.Push;
}

/** True when the player won the settled round */
export function isSeatWinner(player: IPlayer, gameStatus: GameStatus): boolean {
  return (gameStatus === GameStatus.HumanWins && !player.isNPC) || (gameStatus === GameStatus.DealerWins && player.isNPC);
}

/** True when the player lost the settled round */
export function isSeatLoser(player: IPlayer, gameStatus: GameStatus): boolean {
  return (gameStatus === GameStatus.HumanWins && player.isNPC) || (gameStatus === GameStatus.DealerWins && !player.isNPC);
}

/**
 * The most important status for a player, or undefined when there is nothing to say.
 * Checked in priority order: result, then busted, then whose turn it is, then standing.
 */
export function seatStatus(player: IPlayer, gameStatus: GameStatus): SeatStatus | undefined {
  const roundOver = isRoundOver(gameStatus);
  const isActive = !!player.turn && !roundOver;

  if (roundOver && player.isBlackjack && isSeatWinner(player, gameStatus)) return { text: '✨ Blackjack', color: 'success', appearance: 'tint' };
  if (roundOver && isSeatWinner(player, gameStatus)) return { text: '🏆 Winner', color: 'success', appearance: 'tint' };
  if (roundOver && isSeatLoser(player, gameStatus)) return { text: '💔 Loser', color: 'danger', appearance: 'tint' };
  if (gameStatus === GameStatus.Push) return { text: '🤝 Push', color: 'informative', appearance: 'tint' };
  if (player.isBusted) return { text: '💥 Busted', color: 'danger', appearance: 'tint' };
  if (isActive) return { text: player.isNPC ? 'Dealer playing' : 'Your turn', color: 'brand', appearance: 'filled' };
  if (player.isStaying && !roundOver) return { text: 'Standing', color: 'subtle', appearance: 'tint' };
  return undefined;
}
