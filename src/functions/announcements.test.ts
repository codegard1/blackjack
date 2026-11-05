import { describe, expect, it } from 'vitest';
import { GameStatus } from '../enums';
import { GameSnapshot, PlayerSnapshot } from '../types';
import { diffAnnouncements } from './announcements';
import { isRoundOver, isSeatLoser, seatStatus } from './seatStatus';
import { playerDefaults } from '../definitions';
import { IPlayer } from '../interfaces';

const player = (overrides: Partial<PlayerSnapshot> & Pick<PlayerSnapshot, 'key' | 'title' | 'isNPC'>): PlayerSnapshot => ({
  cardCount: 2,
  total: 15,
  isBusted: false,
  isStaying: false,
  isBlackjack: false,
  ...overrides,
});

const snapshot = (overrides: Partial<GameSnapshot> = {}, players: PlayerSnapshot[] = []): GameSnapshot => ({
  gameStatus: GameStatus.InProgress,
  round: 1,
  pot: 0,
  totalPotContributions: 0,
  controllingPlayer: 'chris',
  players: players.length ? players : [
    player({ key: 'chris', title: 'Chris', isNPC: false }),
    player({ key: 'dealer', title: 'Dealer', isNPC: true }),
  ],
  ...overrides,
});

const withPlayer = (base: GameSnapshot, key: string, changes: Partial<PlayerSnapshot>): GameSnapshot => ({
  ...base,
  players: base.players.map((p) => (p.key === key ? { ...p, ...changes } : p)),
});

describe('diffAnnouncements', () => {
  it('announces nothing when nothing changed', () => {
    const state = snapshot();
    expect(diffAnnouncements(state, state, true)).toEqual([]);
  });

  it('announces the combined ante amount even when a new hand refills the pot to the same total', () => {
    const before = snapshot({ pot: 50, totalPotContributions: 100 });
    const after = snapshot({ pot: 50, totalPotContributions: 150 });

    expect(diffAnnouncements(before, after, true)[0]).toEqual({
      title: '+$50 added to the pot',
      subtitle: 'Pot: $50',
      tone: 'brand',
      kind: 'pot-contribution',
    });
  });

  it('announces an added wager', () => {
    const before = snapshot({ pot: 50, totalPotContributions: 50 });
    const after = snapshot({ pot: 75, totalPotContributions: 75 });

    expect(diffAnnouncements(before, after, true)[0]).toMatchObject({
      title: '+$25 added to the pot',
      subtitle: 'Pot: $75',
    });
  });

  it('announces the human turn at the start of a game', () => {
    const before = snapshot({ gameStatus: GameStatus.Init, controllingPlayer: undefined });
    const after = snapshot();
    expect(diffAnnouncements(before, after, true)).toEqual([{ title: "Chris's turn", tone: 'brand' }]);
  });

  it("announces the dealer's turn once the human stands", () => {
    const before = snapshot();
    const after = snapshot({ controllingPlayer: 'dealer' });
    expect(diffAnnouncements(before, after, true)).toEqual([{ title: "Dealer's turn", tone: 'neutral' }]);
  });

  it('announces a dealer hit with the new total when the total may be shown', () => {
    const before = withPlayer(snapshot({ controllingPlayer: 'dealer' }), 'dealer', { cardCount: 2, total: 12 });
    const after = withPlayer(before, 'dealer', { cardCount: 3, total: 16 });
    expect(diffAnnouncements(before, after, true)).toEqual([{ title: 'Dealer hits', subtitle: 'Total 16', tone: 'neutral' }]);
  });

  it('hides the dealer total while the hole card is face down', () => {
    const before = withPlayer(snapshot({ controllingPlayer: 'dealer' }), 'dealer', { cardCount: 2, total: 12 });
    const after = withPlayer(before, 'dealer', { cardCount: 3, total: 16 });
    expect(diffAnnouncements(before, after, false)).toEqual([{ title: 'Dealer hits', tone: 'neutral' }]);
  });

  it('does not treat the initial deal as a dealer hit', () => {
    const before = withPlayer(snapshot(), 'dealer', { cardCount: 0, total: 0 });
    const after = withPlayer(before, 'dealer', { cardCount: 2, total: 17 });
    expect(diffAnnouncements(before, after, true).find((a) => a.title === 'Dealer hits')).toBeUndefined();
  });

  it('announces a dealer stand, then the result', () => {
    const base = withPlayer(snapshot({ controllingPlayer: 'dealer' }), 'chris', { total: 18 });
    const before = withPlayer(base, 'dealer', { total: 17 });
    const after = withPlayer(
      snapshot({ gameStatus: GameStatus.HumanWins, controllingPlayer: undefined }, base.players),
      'dealer',
      { total: 17, isStaying: true },
    );
    expect(diffAnnouncements(before, after, true)).toEqual([
      { title: 'Dealer stands', subtitle: 'Total 17', tone: 'neutral' },
      { title: 'Chris wins!', subtitle: '18 to 17', tone: 'success' },
    ]);
  });

  it('announces a dealer bust instead of a hit', () => {
    const before = withPlayer(snapshot({ controllingPlayer: 'dealer' }), 'dealer', { cardCount: 2, total: 14 });
    const after = withPlayer(
      snapshot({ gameStatus: GameStatus.HumanWins, controllingPlayer: undefined }),
      'dealer',
      { cardCount: 3, total: 24, isBusted: true },
    );
    const titles = diffAnnouncements(before, after, true).map((a) => a.title);
    expect(titles).toEqual(['Dealer busts!', 'Chris wins!']);
    expect(diffAnnouncements(before, after, true)[1]).toMatchObject({ subtitle: 'Dealer busted' });
  });

  it('announces a human bust with a dealer win', () => {
    const before = snapshot();
    const after = withPlayer(
      snapshot({ gameStatus: GameStatus.DealerWins, controllingPlayer: undefined }),
      'chris',
      { cardCount: 3, total: 23, isBusted: true },
    );
    expect(diffAnnouncements(before, after, true)).toEqual([
      { title: 'Chris busts!', subtitle: 'Total 23', tone: 'danger' },
      { title: 'Dealer wins!', subtitle: 'Chris busted', tone: 'danger' },
    ]);
  });

  it('announces a natural blackjack', () => {
    const before = snapshot({ gameStatus: GameStatus.InProgress, round: 1 });
    const after = withPlayer(
      snapshot({ gameStatus: GameStatus.HumanWins, controllingPlayer: undefined, round: 1 }),
      'chris',
      { isBlackjack: true },
    );
    expect(diffAnnouncements(before, after, true)).toEqual([
      { title: 'Chris has blackjack!', tone: 'success' },
      { title: 'Chris wins!', subtitle: 'Blackjack', tone: 'success' },
    ]);
  });

  it('announces a result even when the previous round had already ended', () => {
    // a natural blackjack can end round 2 in the same action that starts it
    const before = snapshot({ gameStatus: GameStatus.DealerWins, controllingPlayer: undefined, round: 1 });
    const after = withPlayer(
      snapshot({ gameStatus: GameStatus.HumanWins, controllingPlayer: undefined, round: 2 }),
      'chris',
      { isBlackjack: true },
    );
    expect(diffAnnouncements(before, after, true).map((a) => a.title)).toContain('Chris wins!');
  });

  it('announces a push', () => {
    const before = snapshot();
    const after = snapshot({ gameStatus: GameStatus.Push, controllingPlayer: undefined });
    expect(diffAnnouncements(before, after, true)).toEqual([{ title: 'Push', subtitle: 'Stakes returned', tone: 'info' }]);
  });
});

describe('seatStatus', () => {
  const seat = (overrides: Partial<IPlayer>): IPlayer => ({ ...playerDefaults, key: 'x', title: 'X', ...overrides });

  it('shows the result before anything else', () => {
    const status = seatStatus(seat({ isNPC: false, isBusted: true, turn: true }), GameStatus.HumanWins);
    expect(status?.text).toBe('🏆 Winner');
  });

  it('marks the losing player after a settled hand', () => {
    expect(seatStatus(seat({ isNPC: true }), GameStatus.HumanWins)?.text).toBe('💔 Loser');
    expect(seatStatus(seat({ isNPC: false }), GameStatus.DealerWins)?.text).toBe('💔 Loser');
    expect(isSeatLoser(seat({ isNPC: true }), GameStatus.HumanWins)).toBe(true);
    expect(isSeatLoser(seat({ isNPC: false }), GameStatus.DealerWins)).toBe(true);
  });

  it('does not mark either player as a loser on a push', () => {
    expect(isSeatLoser(seat({ isNPC: false }), GameStatus.Push)).toBe(false);
    expect(isSeatLoser(seat({ isNPC: true }), GameStatus.Push)).toBe(false);
    expect(seatStatus(seat({ isNPC: false }), GameStatus.Push)?.text).toBe('🤝 Push');
  });

  it('shows busted over standing', () => {
    expect(seatStatus(seat({ isNPC: true, isBusted: true, isStaying: true }), GameStatus.InProgress)?.text).toBe('💥 Busted');
  });

  it('shows whose turn it is while the round is live', () => {
    expect(seatStatus(seat({ isNPC: false, turn: true }), GameStatus.InProgress)?.text).toBe('Your turn');
    expect(seatStatus(seat({ isNPC: true, turn: true }), GameStatus.InProgress)?.text).toBe('Dealer playing');
  });

  it('has no status for an idle seat', () => {
    expect(seatStatus(seat({}), GameStatus.InProgress)).toBeUndefined();
  });

  it('knows which statuses end the round', () => {
    expect(isRoundOver(GameStatus.InProgress)).toBe(false);
    expect(isRoundOver(GameStatus.Push)).toBe(true);
  });
});
