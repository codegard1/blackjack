import { BOTS } from "../characters";
import { Announcement, GameSnapshot, GameState, PlayerSnapshot, WagerSnapshot, WorkNoticeSnapshot } from "../types";
import { roleOf } from "./round";
import { isRoundOver } from "./seatStatus";

/** True for the log entries where a player added to the pot after the antes */
const isWagerEvent = (event: string | undefined): boolean => event === 'bet' || event === 'double' || event === 'split';

/** True for work log entries that also get a toast over the table */
const isWorkNoticeDescription = (description: string): boolean =>
  description.startsWith('left to work:')
  || description.endsWith('wants back in')
  || description.startsWith('returned to the table');

/** Join player names naturally: "A", "A and B", or "A, B and C" */
function formatNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

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
    wagers: state.activityLog.flatMap((entry): WagerSnapshot[] => (
      isWagerEvent(entry.event) && (entry.amount ?? 0) < 0
        ? [{ id: entry.id, name: entry.name, description: entry.description, amount: -(entry.amount ?? 0) }]
        : []
    )),
    workNotices: state.activityLog.flatMap((entry): WorkNoticeSnapshot[] => (
      entry.event === 'work' && isWorkNoticeDescription(entry.description)
        ? [{ id: entry.id, name: entry.name, description: entry.description }]
        : []
    )),
    controllingPlayer: state.controllingPlayer,
    players: state.playerStore.all.map((player): PlayerSnapshot => {
      const handIndex = state.controllingPlayer === player.key ? state.activeHandIndex : 0;
      const hand = state.deck.hand(player.key, handIndex);
      return {
        key: player.key,
        title: player.title,
        isNPC: player.isNPC,
        role: roleOf(player) ?? 'human',
        cardCount: hand?.cards.length ?? 0,
        total: hand ? state.deck.getHandValue(player.key, handIndex).highest : 0,
        isBusted: !!player.isBusted,
        isStaying: !!player.isStaying,
        isBlackjack: !!player.isBlackjack,
        isSittingOut: !!player.isSittingOut,
        ...(player.awayTask ? { awayTask: player.awayTask } : {}),
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

/** How one seat's hand ended against the dealer, told in the seat's name */
function seatResult(player: PlayerSnapshot, dealer: PlayerSnapshot): Announcement | undefined {
  const base = { kind: 'result' as const, category: 'gameplay' as const, playerKey: player.key };
  switch (player.result) {
    case 'blackjack':
      return { ...base, title: `${player.title} wins!`, subtitle: 'Blackjack', tone: 'success' };
    case 'win':
      return {
        ...base,
        title: `${player.title} wins!`,
        subtitle: dealer.isBusted ? `${dealer.title} busted` : `${player.total} to ${dealer.total}`,
        tone: 'success',
      };
    case 'push':
      return { ...base, title: `${player.title} pushes`, subtitle: 'Stake returned', tone: 'info' };
    case 'loss':
      return {
        ...base,
        title: `${player.title} loses`,
        subtitle: player.isBusted ? 'Busted'
          : dealer.isBlackjack ? `${dealer.title} has blackjack`
          : `${dealer.total} to ${player.total}`,
        tone: 'danger',
      };
    default:
      return undefined;
  }
}

/** How the dealer came out of the round against the whole table */
function dealerResult(dealer: PlayerSnapshot): Announcement | undefined {
  const base = { kind: 'result' as const, category: 'gameplay' as const, playerKey: dealer.key };
  const subtitle = dealer.isBusted ? `Busted · Total ${dealer.total}` : undefined;
  switch (dealer.result) {
    case 'win':
      return { ...base, title: `${dealer.title} wins!`, ...(subtitle ? { subtitle } : {}), tone: 'success' };
    case 'loss':
      return { ...base, title: `${dealer.title} loses`, ...(subtitle ? { subtitle } : {}), tone: 'danger' };
    case 'push':
      return { ...base, title: `${dealer.title} breaks even`, ...(subtitle ? { subtitle } : {}), tone: 'info' };
    default:
      return undefined;
  }
}

/**
 * The end of the round: result announcements for the human's seat and the dealer only,
 * in turn order. Seats without a result (such as a human who sat out) are skipped.
 */
function resultAnnouncements(next: GameSnapshot): Announcement[] {
  const dealer = next.players.find((player) => player.role === 'dealer');
  if (!dealer) return [{ title: 'Round over', tone: 'info', category: 'gameplay' }];

  const human = next.players.find((player) => player.role === 'human');
  const results = [
    human ? seatResult(human, dealer) : undefined,
    dealerResult(dealer),
  ].filter((result): result is Announcement => !!result);
  return results.length ? results : [{ title: 'Round over', tone: 'info', category: 'gameplay' }];
}

/**
 * Describe what changed between two snapshots as short announcements:
 * work notices, pot contributions, sit-outs, mid-round blackjacks and busts, and results.
 * @param prev snapshot before the latest state change
 * @param next snapshot after the latest state change
 * @param revealDealerTotal true when the dealer's total may be shown
 */
export function diffAnnouncements(prev: GameSnapshot, next: GameSnapshot, revealDealerTotal: boolean): Announcement[] {
  const announcements: Announcement[] = [];
  const before = new Map(prev.players.map((player) => [player.key, player] as const));
  const logRestarted = next.totalPotContributions < prev.totalPotContributions;
  const potContribution = logRestarted
    ? next.totalPotContributions
    : next.totalPotContributions - prev.totalPotContributions;
  const newRound = next.round !== prev.round;
  // Compare round numbers too: a natural blackjack can end one round and start the next within a single action
  const roundJustEnded = isRoundOver(next.gameStatus) && (!isRoundOver(prev.gameStatus) || newRound);

  const prevWorkNotices = prev.workNotices ?? [];
  const nextWorkNotices = next.workNotices ?? [];
  const lastWorkId = prevWorkNotices.at(-1)?.id ?? 0;
  const newWorkNotices = logRestarted || (nextWorkNotices.at(-1)?.id ?? 0) < lastWorkId
    ? nextWorkNotices
    : nextWorkNotices.filter((notice) => notice.id > lastWorkId);
  for (const notice of newWorkNotices) {
    const botKey = BOTS.find((bot) => bot.name === notice.name)?.id
      ?? next.players.find((player) => player.title === notice.name)?.key;
    const tone = notice.description.startsWith('returned') ? 'success'
      : notice.description.endsWith('wants back in') ? 'info'
      : 'neutral';
    announcements.push({
      title: `${notice.name} ${notice.description}`,
      tone,
      category: 'pot',
      playerKey: botKey,
    });
  }

  // A single wager keeps its own wording; antes and multiple contributions merge into one pot toast
  const lastWagerId = prev.wagers.at(-1)?.id ?? 0;
  const newWagers = logRestarted || (next.wagers.at(-1)?.id ?? 0) < lastWagerId
    ? next.wagers
    : next.wagers.filter((wager) => wager.id > lastWagerId);
  const wagered = newWagers.reduce((total, wager) => total + wager.amount, 0);
  const anted = Math.max(0, potContribution - wagered);

  if (anted === 0 && newWagers.length === 1) {
    const [wager] = newWagers;
    announcements.push({
      title: `${wager.name} ${wager.description}`,
      subtitle: `Pot: $${next.pot}`,
      tone: 'brand',
      category: 'pot',
      kind: 'pot-contribution',
      playerKey: next.players.find((player) => player.title === wager.name)?.key,
    });
  } else if (potContribution > 0) {
    announcements.push({
      title: `+$${potContribution} added to the pot`,
      subtitle: `Pot: $${next.pot}`,
      tone: 'brand',
      category: 'pot',
      kind: 'pot-contribution',
    });
  }

  // Players sitting out the round (excluding away-working characters, who have work notices)
  const satOut = next.players.filter((player) => {
    if (!player.isSittingOut || player.awayTask) return false;
    const was = before.get(player.key);
    return !!was && (newRound || (!was.isSittingOut && !isRoundOver(next.gameStatus)));
  });
  if (satOut.length === 1) {
    announcements.push({
      title: `${satOut[0].title} sits out this round`,
      tone: 'neutral',
      category: 'pot',
      playerKey: satOut[0].key,
    });
  } else if (satOut.length > 1) {
    announcements.push({
      title: `${formatNames(satOut.map((player) => player.title))} sit out this round`,
      tone: 'neutral',
      category: 'pot',
    });
  }

  if (!roundJustEnded) {
    const blackjacks = next.players.filter((player) => {
      const was = before.get(player.key);
      return !!was && player.isBlackjack && (!was.isBlackjack || newRound);
    });
    if (blackjacks.length === 1) {
      announcements.push({
        title: `${blackjacks[0].title} has blackjack!`,
        tone: 'success',
        category: 'gameplay',
        playerKey: blackjacks[0].key,
      });
    } else if (blackjacks.length > 1) {
      announcements.push({
        title: `${formatNames(blackjacks.map((player) => player.title))} have blackjack!`,
        tone: 'success',
        category: 'gameplay',
      });
    }

    for (const player of next.players) {
      const was = before.get(player.key);
      if (!was) continue;

      if (player.isBusted && !was.isBusted) {
        announcements.push({
          title: `${player.title} busts!`,
          subtitle: totalLine(player, revealDealerTotal),
          tone: 'danger',
          category: 'gameplay',
          playerKey: player.key,
        });
      }
    }
  }

  if (roundJustEnded) announcements.push(...resultAnnouncements(next));

  return announcements;
}
