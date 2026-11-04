import { GameStatus } from "../enums";
import { Announcement, GameSnapshot, GameState, PlayerSnapshot } from "../types";
import { isRoundOver } from "./seatStatus";

/**
 * Capture the parts of the game state that announcements are derived from
 */
export function snapshotGame(state: GameState): GameSnapshot {
  return {
    gameStatus: state.gameStatus,
    round: state.round,
    controllingPlayer: state.controllingPlayer,
    players: state.playerStore.all.map((player): PlayerSnapshot => {
      const hand = state.deck.playerHands[player.key];
      return {
        key: player.key,
        title: player.title,
        isNPC: player.isNPC,
        cardCount: hand?.cards.length ?? 0,
        total: hand ? state.deck.getHandValue(player.key).highest : 0,
        isBusted: !!player.isBusted,
        isStaying: !!player.isStaying,
        isBlackjack: !!player.isBlackjack,
      };
    }),
  };
}

/** The dealer's total stays hidden while the dealer's hole card is face down */
function totalLine(player: PlayerSnapshot, revealDealerTotal: boolean): string | undefined {
  if (player.isNPC && !revealDealerTotal) return undefined;
  return `Total ${player.total}`;
}

function resultAnnouncement(next: GameSnapshot): Announcement {
  if (next.gameStatus === GameStatus.Push) return { title: 'Push', subtitle: 'Stakes returned', tone: 'info' };

  const human = next.players.find((player) => !player.isNPC);
  const dealer = next.players.find((player) => player.isNPC);
  const humanWon = next.gameStatus === GameStatus.HumanWins;
  const winner = humanWon ? human : dealer;
  const loser = humanWon ? dealer : human;
  if (!winner || !loser) return { title: 'Round over', tone: 'info' };

  const subtitle = loser.isBusted ? `${loser.title} busted`
    : winner.isBlackjack ? 'Blackjack'
    : `${winner.total} to ${loser.total}`;
  return { title: `${winner.title} wins!`, subtitle, tone: humanWon ? 'success' : 'danger' };
}

/**
 * Describe what changed between two snapshots as short announcements, in the
 * order they happened: turn change, blackjack, dealer hit or stand, bust, result.
 * @param prev snapshot before the latest state change
 * @param next snapshot after the latest state change
 * @param revealDealerTotal true when the dealer's total may be shown
 */
export function diffAnnouncements(prev: GameSnapshot, next: GameSnapshot, revealDealerTotal: boolean): Announcement[] {
  const announcements: Announcement[] = [];
  const before = new Map(prev.players.map((player) => [player.key, player] as const));

  // Turn changes, including the first turn of a new round or game
  const controller = next.players.find((player) => player.key === next.controllingPlayer);
  if (next.gameStatus === GameStatus.InProgress && controller && controller.key !== prev.controllingPlayer) {
    announcements.push({
      title: `${controller.title}'s turn`,
      tone: controller.isNPC ? 'neutral' : 'brand',
    });
  }

  for (const player of next.players) {
    const was = before.get(player.key);
    if (!was) continue;

    if (player.isBlackjack && !was.isBlackjack) {
      announcements.push({ title: `${player.title} has blackjack!`, tone: 'success' });
    }

    if (player.isBusted && !was.isBusted) {
      announcements.push({ title: `${player.title} busts!`, subtitle: totalLine(player, revealDealerTotal), tone: 'danger' });
    }

    if (player.isNPC && !player.isBusted) {
      if (player.isStaying && !was.isStaying) {
        announcements.push({ title: 'Dealer stands', subtitle: totalLine(player, revealDealerTotal), tone: 'neutral' });
      } else if (player.cardCount > was.cardCount && was.cardCount > 0 && next.controllingPlayer === player.key) {
        announcements.push({ title: 'Dealer hits', subtitle: totalLine(player, revealDealerTotal), tone: 'neutral' });
      }
    }
  }

  // Compare round numbers too: a natural blackjack can end one round and start the next within a single action
  const roundJustEnded = isRoundOver(next.gameStatus) && (!isRoundOver(prev.gameStatus) || prev.round !== next.round);
  if (roundJustEnded) announcements.push(resultAnnouncement(next));

  return announcements;
}
