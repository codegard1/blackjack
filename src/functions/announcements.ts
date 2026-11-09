import { GameStatus } from "../enums";
import { Announcement, GameSnapshot, GameState, PlayerSnapshot } from "../types";
import { roleOf } from "./round";
import { isRoundOver } from "./seatStatus";

/**
 * Capture the parts of the game state that announcements are derived from
 */
export function snapshotGame(state: GameState): GameSnapshot {
  return {
    gameStatus: state.gameStatus,
    round: state.round,
    pot: state.pot,
    totalPotContributions: state.activityLog.reduce((total, entry) => (
      entry.event === 'ante' || entry.event === 'bet' || entry.event === 'double' || entry.event === 'split'
        ? total + Math.max(0, -(entry.amount ?? 0))
        : total
    ), 0),
    controllingPlayer: state.controllingPlayer,
    players: state.playerStore.all.map((player): PlayerSnapshot => {
      const hand = state.deck.playerHands[player.key];
      return {
        key: player.key,
        title: player.title,
        isNPC: player.isNPC,
        role: roleOf(player) ?? 'human',
        cardCount: hand?.cards.length ?? 0,
        total: hand ? state.deck.getHandValue(player.key).highest : 0,
        isBusted: !!player.isBusted,
        isStaying: !!player.isStaying,
        isBlackjack: !!player.isBlackjack,
        result: player.result,
      };
    }),
  };
}

/** The dealer's total stays hidden while the dealer's hole card is face down */
function totalLine(player: PlayerSnapshot, revealDealerTotal: boolean): string | undefined {
  if (player.role === 'dealer' && !revealDealerTotal) return undefined;
  return `Total ${player.total}`;
}

/** The end of the round, told from the human's seat */
function resultAnnouncement(next: GameSnapshot): Announcement {
  const human = next.players.find((player) => player.role === 'human');
  const dealer = next.players.find((player) => player.role === 'dealer');
  if (!human?.result || !dealer) return { title: 'Round over', tone: 'info' };

  switch (human.result) {
    case 'blackjack':
      return { title: `${human.title} wins!`, subtitle: 'Blackjack', tone: 'success', playerKey: human.key };
    case 'win':
      return {
        title: `${human.title} wins!`,
        subtitle: dealer.isBusted ? `${dealer.title} busted` : `${human.total} to ${dealer.total}`,
        tone: 'success',
        playerKey: human.key,
      };
    case 'push':
      return { title: 'Push', subtitle: 'Stake returned', tone: 'info' };
    default:
      return {
        title: `${dealer.title} wins!`,
        subtitle: human.isBusted ? `${human.title} busted`
          : dealer.isBlackjack ? 'Blackjack'
          : `${dealer.total} to ${human.total}`,
        tone: 'danger',
        playerKey: dealer.key,
      };
  }
}

/**
 * Describe what changed between two snapshots as short announcements, in the
 * order they happened: turn change, blackjack, computer hit or stand, bust, result.
 * @param prev snapshot before the latest state change
 * @param next snapshot after the latest state change
 * @param revealDealerTotal true when the dealer's total may be shown
 */
export function diffAnnouncements(prev: GameSnapshot, next: GameSnapshot, revealDealerTotal: boolean): Announcement[] {
  const announcements: Announcement[] = [];
  const before = new Map(prev.players.map((player) => [player.key, player] as const));
  const potContribution = next.totalPotContributions >= prev.totalPotContributions
    ? next.totalPotContributions - prev.totalPotContributions
    : next.totalPotContributions;

  if (potContribution > 0) {
    announcements.push({
      title: `+$${potContribution} added to the pot`,
      subtitle: `Pot: $${next.pot}`,
      tone: 'brand',
      kind: 'pot-contribution',
    });
  }

  for (const player of next.players) {
    const was = before.get(player.key);
    if (!was) continue;

    if (player.isBlackjack && !was.isBlackjack) {
      announcements.push({ title: `${player.title} has blackjack!`, tone: 'success', playerKey: player.key });
    }

    if (player.isBusted && !was.isBusted) {
      announcements.push({ title: `${player.title} busts!`, subtitle: totalLine(player, revealDealerTotal), tone: 'danger', playerKey: player.key });
    }

    if (player.isNPC && !player.isBusted) {
      if (player.isStaying && !was.isStaying) {
        announcements.push({ title: `${player.title} stands`, subtitle: totalLine(player, revealDealerTotal), tone: 'neutral', playerKey: player.key });
      } else if (player.cardCount > was.cardCount && was.cardCount > 0 && prev.controllingPlayer === player.key) {
        announcements.push({ title: `${player.title} hits`, subtitle: totalLine(player, revealDealerTotal), tone: 'neutral', playerKey: player.key });
      }
    }
  }

  // Turn changes, including the first turn of a new round or game; after the previous seat's move
  const controller = next.players.find((player) => player.key === next.controllingPlayer);
  if (next.gameStatus === GameStatus.InProgress && controller && controller.key !== prev.controllingPlayer) {
    announcements.push({
      title: `${controller.title}'s turn`,
      tone: controller.isNPC ? 'neutral' : 'brand',
      playerKey: controller.key,
    });
  }

  // Compare round numbers too: a natural blackjack can end one round and start the next within a single action
  const roundJustEnded = isRoundOver(next.gameStatus) && (!isRoundOver(prev.gameStatus) || prev.round !== next.round);
  if (roundJustEnded) announcements.push(resultAnnouncement(next));

  return announcements;
}
