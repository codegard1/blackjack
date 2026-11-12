import { describe, expect, it } from 'vitest';
import { createGameState } from '../context';
import { GameAction, GameStatus } from '../enums';
import { gameReducer } from './gameReducer';
import { GameSnapshot, PlayerSnapshot } from '../types';
import { diffAnnouncements, snapshotGame } from './announcements';
import { isRoundOver, isSeatLoser, seatStatus, seatTag } from './seatStatus';
import { playerDefaults } from '../definitions';
import { IPlayer } from '../interfaces';

const player = (overrides: Partial<PlayerSnapshot> & Pick<PlayerSnapshot, 'key' | 'title' | 'isNPC'>): PlayerSnapshot => ({
  cardCount: 2,
  total: 15,
  isBusted: false,
  isStaying: false,
  isBlackjack: false,
  ...overrides,
  role: overrides.role ?? (overrides.isNPC ? 'dealer' : 'human'),
});

const snapshot = (overrides: Partial<GameSnapshot> = {}, players: PlayerSnapshot[] = []): GameSnapshot => ({
  gameStatus: GameStatus.InProgress,
  round: 1,
  pot: 0,
  totalPotContributions: 0,
  wagers: [],
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

const roundOver = (changes: Partial<PlayerSnapshot>, overrides: Partial<GameSnapshot> = {}): GameSnapshot =>
  withPlayer(snapshot({ gameStatus: GameStatus.RoundOver, controllingPlayer: undefined, ...overrides }), 'chris', changes);

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

  it('announces money added to the pot that no wager accounts for as one pooled amount', () => {
    const before = snapshot({ pot: 50, totalPotContributions: 50 });
    const after = snapshot({ pot: 75, totalPotContributions: 75 });

    expect(diffAnnouncements(before, after, true)[0]).toMatchObject({
      title: '+$25 added to the pot',
      subtitle: 'Pot: $75',
    });
  });

  describe('wagers', () => {
    const chrisWager = { id: 7, name: 'Chris', description: 'wagered $25', amount: 25 };

    it("announces a wager in the player's name, with the pot after it", () => {
      const before = snapshot({ pot: 50, totalPotContributions: 50 });
      const after = snapshot({ pot: 75, totalPotContributions: 75, wagers: [chrisWager] });

      expect(diffAnnouncements(before, after, true)).toEqual([{
        title: 'Chris wagered $25',
        subtitle: 'Pot: $75',
        tone: 'brand',
        kind: 'pot-contribution',
        playerKey: 'chris',
      }]);
    });

    it('words a double down and a split the way the activity log does', () => {
      const before = snapshot({ pot: 50, totalPotContributions: 50 });
      const doubled = snapshot({ pot: 100, totalPotContributions: 100, wagers: [{ id: 8, name: 'Chris', description: 'doubled down for $50', amount: 50 }] });
      const split = snapshot({ pot: 100, totalPotContributions: 100, wagers: [{ id: 9, name: 'Chris', description: 'split for $50', amount: 50 }] });

      expect(diffAnnouncements(before, doubled, true)[0]).toMatchObject({ title: 'Chris doubled down for $50', subtitle: 'Pot: $100', playerKey: 'chris' });
      expect(diffAnnouncements(before, split, true)[0]).toMatchObject({ title: 'Chris split for $50', playerKey: 'chris' });
    });

    it('announces only the wagers that are new, one toast each, with the pot growing through them', () => {
      const earlier = { id: 3, name: 'Dealer', description: 'wagered $25', amount: 25 };
      const before = snapshot({ pot: 100, totalPotContributions: 100, wagers: [earlier] });
      const after = snapshot({
        pot: 150,
        totalPotContributions: 150,
        wagers: [earlier, chrisWager, { id: 8, name: 'Dealer', description: 'wagered $25', amount: 25 }],
      });

      expect(diffAnnouncements(before, after, true).map((item) => [item.title, item.subtitle, item.playerKey])).toEqual([
        ['Chris wagered $25', 'Pot: $125', 'chris'],
        ['Dealer wagered $25', 'Pot: $150', 'dealer'],
      ]);
    });

    it('keeps the antes in one pooled toast ahead of the wagers made with them', () => {
      const before = snapshot({ pot: 0, totalPotContributions: 0 });
      const after = snapshot({ pot: 75, totalPotContributions: 75, wagers: [chrisWager] });

      expect(diffAnnouncements(before, after, true).map((item) => [item.title, item.subtitle])).toEqual([
        ['+$50 added to the pot', 'Pot: $50'],
        ['Chris wagered $25', 'Pot: $75'],
      ]);
    });

    it('announces every wager after the log starts over for a new game', () => {
      const before = snapshot({ pot: 200, totalPotContributions: 300, wagers: [{ ...chrisWager, id: 40 }] });
      const after = snapshot({ pot: 50, totalPotContributions: 50, wagers: [{ ...chrisWager, id: 2 }] });

      // the new game's log is shorter than the old one, so everything in it is new: $25 of antes, then the wager
      expect(diffAnnouncements(before, after, true).map((item) => [item.title, item.subtitle])).toEqual([
        ['+$25 added to the pot', 'Pot: $25'],
        ['Chris wagered $25', 'Pot: $50'],
      ]);
    });

    it('still names the wager when no seat has the logged name', () => {
      const before = snapshot({ pot: 50, totalPotContributions: 50 });
      const after = snapshot({ pot: 75, totalPotContributions: 75, wagers: [{ ...chrisWager, name: 'Someone' }] });

      expect(diffAnnouncements(before, after, true)[0]).toMatchObject({ title: 'Someone wagered $25', playerKey: undefined });
    });
  });

  it('announces the human turn at the start of a game', () => {
    const before = snapshot({ gameStatus: GameStatus.Init, controllingPlayer: undefined });
    const after = snapshot();
    expect(diffAnnouncements(before, after, true)).toEqual([{ title: "Chris's turn", tone: 'brand', playerKey: 'chris' }]);
  });

  it("announces the dealer's turn once the human stands", () => {
    const before = snapshot();
    const after = snapshot({ controllingPlayer: 'dealer' });
    expect(diffAnnouncements(before, after, true)).toEqual([{ title: "Dealer's turn", tone: 'neutral', playerKey: 'dealer' }]);
  });

  it('announces a dealer hit with the new total when the total may be shown', () => {
    const before = withPlayer(snapshot({ controllingPlayer: 'dealer' }), 'dealer', { cardCount: 2, total: 12 });
    const after = withPlayer(before, 'dealer', { cardCount: 3, total: 16 });
    expect(diffAnnouncements(before, after, true)).toEqual([{ title: 'Dealer hits', subtitle: 'Total 16', tone: 'neutral', playerKey: 'dealer' }]);
  });

  it('hides the dealer total while the hole card is face down', () => {
    const before = withPlayer(snapshot({ controllingPlayer: 'dealer' }), 'dealer', { cardCount: 2, total: 12 });
    const after = withPlayer(before, 'dealer', { cardCount: 3, total: 16 });
    expect(diffAnnouncements(before, after, false)).toEqual([{ title: 'Dealer hits', subtitle: undefined, tone: 'neutral', playerKey: 'dealer' }]);
  });

  it('does not treat the initial deal as a dealer hit', () => {
    const before = withPlayer(snapshot(), 'dealer', { cardCount: 0, total: 0 });
    const after = withPlayer(before, 'dealer', { cardCount: 2, total: 17 });
    expect(diffAnnouncements(before, after, true).find((a) => a.title === 'Dealer hits')).toBeUndefined();
  });

  it('announces each seat\'s dealt cards without revealing the dealer hole card', () => {
    const before = withPlayer(withPlayer(snapshot(), 'chris', { cardCount: 0, total: 0, cards: [] }), 'dealer', { cardCount: 0, total: 0, cards: [] });
    const after = withPlayer(
      withPlayer(before, 'chris', { cardCount: 2, total: 16, cards: ['Queen of Hearts', 'Six of Clubs'] }),
      'dealer',
      { cardCount: 2, total: 18, cards: ['Ace of Spades', 'Eight of Diamonds'] },
    );

    expect(diffAnnouncements(before, after, false)).toEqual([
      { title: 'Chris was dealt', subtitle: 'Queen of Hearts and Six of Clubs. Total 16', tone: 'neutral', playerKey: 'chris' },
      { title: 'Dealer was dealt', subtitle: 'One face-down card and Eight of Diamonds', tone: 'neutral', playerKey: 'dealer' },
    ]);
  });

  it('announces the new deal when the next hand replaces cards without changing hand size', () => {
    const before = snapshot({ round: 1 }, [
      player({ key: 'chris', title: 'Chris', isNPC: false, cards: ['Nine of Clubs', 'Six of Hearts'] }),
      player({ key: 'dealer', title: 'Dealer', isNPC: true, role: 'dealer', cards: ['Ace of Spades', 'Eight of Diamonds'] }),
    ]);
    const after = snapshot({ round: 2 }, [
      player({ key: 'chris', title: 'Chris', isNPC: false, cards: ['King of Clubs', 'Five of Hearts'] }),
      player({ key: 'dealer', title: 'Dealer', isNPC: true, role: 'dealer', cards: ['Queen of Spades', 'Seven of Diamonds'] }),
    ]);

    expect(diffAnnouncements(before, after, false).filter((item) => item.title.endsWith('was dealt'))).toEqual([
      { title: 'Chris was dealt', subtitle: 'King of Clubs and Five of Hearts. Total 15', tone: 'neutral', playerKey: 'chris' },
      { title: 'Dealer was dealt', subtitle: 'One face-down card and Seven of Diamonds', tone: 'neutral', playerKey: 'dealer' },
    ]);
  });

  it('announces the drawn card and resulting total on a human turn', () => {
    const before = withPlayer(snapshot(), 'chris', { cardCount: 2, total: 15, cards: ['Nine of Clubs', 'Six of Hearts'] });
    const after = withPlayer(before, 'chris', { cardCount: 3, total: 20, cards: ['Nine of Clubs', 'Six of Hearts', 'Five of Spades'] });

    expect(diffAnnouncements(before, after, false)).toContainEqual({
      title: 'Chris hits',
      subtitle: 'Five of Spades. Total 20',
      tone: 'brand',
      playerKey: 'chris',
    });
  });

  it('tracks draws and totals on the active split hand', () => {
    const state = gameReducer(createGameState(), { type: GameAction.NewGame, playerKey: ['chris', 'dealer'] });
    state.controllingPlayer = 'chris';
    state.activeHandIndex = 1;
    state.deck.playerHands.chris.cards = ['Club_10'];
    state.deck.playerHands.chris.splitHands = [{
      cards: ['Heart_5'],
      handValue: { aceAsEleven: 5, aceAsOne: 5, highest: 5 },
    }];
    const before = snapshotGame(state);

    state.deck.hand('chris', 1)?.cards.push('Spade_10');
    state.deck.updateHandValue('chris', 1);
    const after = snapshotGame(state);

    expect(after.players.find((player) => player.key === 'chris')).toMatchObject({
      cardCount: 2,
      cards: ['Five of Hearts', 'Ten of Spades'],
      total: 15,
    });
    expect(diffAnnouncements(before, after, false)).toContainEqual({
      title: 'Chris hits',
      subtitle: 'Ten of Spades. Total 15',
      tone: 'brand',
      playerKey: 'chris',
    });
  });

  it('announces a dealer stand, then the result', () => {
    const base = withPlayer(snapshot({ controllingPlayer: 'dealer' }), 'chris', { total: 18 });
    const before = withPlayer(base, 'dealer', { total: 17 });
    const after = withPlayer(
      withPlayer(snapshot({ gameStatus: GameStatus.RoundOver, controllingPlayer: undefined }, base.players), 'chris', { result: 'win' }),
      'dealer',
      { total: 17, isStaying: true },
    );
    expect(diffAnnouncements(before, after, true)).toEqual([
      { title: 'Dealer stands', subtitle: 'Total 17', tone: 'neutral', playerKey: 'dealer' },
      { title: 'Chris wins!', subtitle: '18 to 17', tone: 'success', playerKey: 'chris', kind: 'result' },
    ]);
  });

  it('announces a dealer bust instead of a hit', () => {
    const before = withPlayer(snapshot({ controllingPlayer: 'dealer' }), 'dealer', { cardCount: 2, total: 14 });
    const after = withPlayer(roundOver({ result: 'win' }), 'dealer', { cardCount: 3, total: 24, isBusted: true });
    const titles = diffAnnouncements(before, after, true).map((a) => a.title);
    expect(titles).toEqual(['Dealer busts!', 'Chris wins!']);
    expect(diffAnnouncements(before, after, true)[1]).toMatchObject({ subtitle: 'Dealer busted' });
  });

  it('announces a human bust, then the loss and the dealer winning', () => {
    const before = snapshot();
    const after = withPlayer(roundOver({ cardCount: 3, total: 23, isBusted: true, result: 'loss' }), 'dealer', { result: 'win' });
    expect(diffAnnouncements(before, after, true)).toEqual([
      { title: 'Chris busts!', subtitle: 'Total 23', tone: 'danger', playerKey: 'chris' },
      { title: 'Chris loses', subtitle: 'Busted', tone: 'danger', playerKey: 'chris', kind: 'result' },
      { title: 'Dealer wins!', tone: 'success', playerKey: 'dealer', kind: 'result' },
    ]);
  });

  it('announces a natural blackjack', () => {
    const before = snapshot({ gameStatus: GameStatus.InProgress, round: 1 });
    const after = roundOver({ isBlackjack: true, result: 'blackjack' }, { round: 1 });
    expect(diffAnnouncements(before, after, true)).toEqual([
      { title: 'Chris has blackjack!', tone: 'success', playerKey: 'chris' },
      { title: 'Chris wins!', subtitle: 'Blackjack', tone: 'success', playerKey: 'chris', kind: 'result' },
    ]);
  });

  it('announces a result even when the previous round had already ended', () => {
    // a natural blackjack can end round 2 in the same action that starts it
    const before = snapshot({ gameStatus: GameStatus.RoundOver, controllingPlayer: undefined, round: 1 });
    const after = roundOver({ isBlackjack: true, result: 'blackjack' }, { round: 2 });
    expect(diffAnnouncements(before, after, true).map((a) => a.title)).toContain('Chris wins!');
  });

  it('announces a push in the seat\'s name', () => {
    const before = snapshot();
    const after = roundOver({ result: 'push' });
    expect(diffAnnouncements(before, after, true)).toEqual([
      { title: 'Chris pushes', subtitle: 'Stake returned', tone: 'info', playerKey: 'chris', kind: 'result' },
    ]);
  });

  describe('results at the end of a round', () => {
    const table = [
      player({ key: 'chris', title: 'Chris', isNPC: false, total: 18 }),
      player({ key: 'ogion', title: 'Ogion', isNPC: true, role: 'bot', total: 12 }),
      player({ key: 'shevek', title: 'Shevek', isNPC: true, role: 'bot', total: 20 }),
      player({ key: 'dealer', title: 'Faxe', isNPC: true, total: 19 }),
    ];
    const ended = (changes: Record<string, Partial<PlayerSnapshot>>): GameSnapshot => {
      const base = snapshot({ gameStatus: GameStatus.RoundOver, controllingPlayer: undefined }, table);
      return { ...base, players: base.players.map((p) => ({ ...p, ...(changes[p.key] ?? {}) })) };
    };
    const results = (next: GameSnapshot) => diffAnnouncements(snapshot({ controllingPlayer: 'dealer' }, table), next, true)
      .filter((announcement) => announcement.kind === 'result');

    it('tells every seat\'s result in turn order, the players first and the dealer last', () => {
      const next = ended({ chris: { result: 'loss' }, ogion: { result: 'loss', isBusted: true }, shevek: { result: 'win' }, dealer: { result: 'push' } });
      expect(results(next).map((a) => [a.title, a.playerKey])).toEqual([
        ['Chris loses', 'chris'],
        ['Ogion loses', 'ogion'],
        ['Shevek wins!', 'shevek'],
        ['Faxe breaks even', 'dealer'],
      ]);
    });

    it('says why a seat won or lost', () => {
      const next = ended({
        chris: { result: 'loss' },
        ogion: { result: 'loss', isBusted: true },
        shevek: { result: 'win' },
        dealer: { result: 'win' },
      });
      expect(results(next).map((a) => a.subtitle)).toEqual(['19 to 18', 'Busted', '20 to 19', undefined]);
    });

    it('credits a win to the dealer busting, and a loss to the dealer having blackjack', () => {
      const busted = ended({ chris: { result: 'win' }, dealer: { result: 'loss', isBusted: true, total: 24 } });
      expect(results(busted)[0]).toMatchObject({ title: 'Chris wins!', subtitle: 'Faxe busted' });
      const natural = ended({ chris: { result: 'loss' }, dealer: { result: 'win', isBlackjack: true, total: 21 } });
      expect(results(natural)[0]).toMatchObject({ title: 'Chris loses', subtitle: 'Faxe has blackjack' });
    });

    it('colors a result by how it went for that seat, the dealer included', () => {
      const next = ended({ chris: { result: 'win' }, ogion: { result: 'push' }, shevek: { result: 'loss' }, dealer: { result: 'loss' } });
      expect(results(next).map((a) => a.tone)).toEqual(['success', 'info', 'danger', 'danger']);
    });

    it('skips a seat with no result, as one that sat the round out', () => {
      const next = ended({ chris: { result: 'win' }, shevek: { result: 'loss' }, dealer: { result: 'push' } });
      expect(results(next).map((a) => a.playerKey)).toEqual(['chris', 'shevek', 'dealer']);
    });

    it('falls back to a plain notice when no seat has a result', () => {
      const next = ended({});
      expect(diffAnnouncements(snapshot({ controllingPlayer: 'dealer' }, table), next, true).filter((a) => a.title === 'Round over'))
        .toEqual([{ title: 'Round over', tone: 'info' }]);
    });
  });

  it('announces computer players hitting and standing, with their totals', () => {
    const players = [
      player({ key: 'chris', title: 'Chris', isNPC: false }),
      player({ key: 'ogion', title: 'Ogion', isNPC: true, role: 'bot', total: 12 }),
      player({ key: 'dealer', title: 'Faxe', isNPC: true }),
    ];
    const before = snapshot({ controllingPlayer: 'ogion' }, players);
    const hits = withPlayer(before, 'ogion', { cardCount: 3, total: 15 });
    // a computer player's cards are face up, so the total shows even while the dealer's is hidden
    expect(diffAnnouncements(before, hits, false)).toEqual([{ title: 'Ogion hits', subtitle: 'Total 15', tone: 'neutral', playerKey: 'ogion' }]);

    const stands = withPlayer({ ...hits, controllingPlayer: 'dealer' }, 'ogion', { isStaying: true });
    expect(diffAnnouncements(hits, stands, false).map((a) => a.title)).toEqual(['Ogion stands', "Faxe's turn"]);
  });
});

describe('seatStatus', () => {
  const seat = (overrides: Partial<IPlayer>): IPlayer => ({ ...playerDefaults, key: 'x', title: 'X', ...overrides });

  it('shows the result before anything else', () => {
    const status = seatStatus(seat({ isNPC: false, isBusted: true, turn: true, result: 'win' }), GameStatus.RoundOver);
    expect(status?.text).toBe('🏆 Winner');
  });

  it('marks a losing hand after the round, and a busted one as busted', () => {
    expect(seatStatus(seat({ result: 'loss' }), GameStatus.RoundOver)?.text).toBe('💔 Loser');
    expect(seatStatus(seat({ result: 'loss', isBusted: true }), GameStatus.RoundOver)?.text).toBe('💥 Busted');
    expect(isSeatLoser(seat({ result: 'loss' }), GameStatus.RoundOver)).toBe(true);
    expect(isSeatLoser(seat({ result: 'push' }), GameStatus.RoundOver)).toBe(false);
  });

  it('shows a push for a player and an even result for the dealer', () => {
    expect(seatStatus(seat({ result: 'push' }), GameStatus.RoundOver)?.text).toBe('🤝 Push');
    expect(seatStatus(seat({ isNPC: true, role: 'dealer', result: 'push' }), GameStatus.RoundOver)?.text).toBe('🤝 Even');
  });

  it('shows a natural blackjack as soon as it is dealt', () => {
    expect(seatStatus(seat({ result: 'blackjack' }), GameStatus.InProgress)?.text).toBe('✨ Blackjack');
  });

  it('shows busted over standing', () => {
    expect(seatStatus(seat({ isNPC: true, isBusted: true, isStaying: true }), GameStatus.InProgress)?.text).toBe('💥 Busted');
  });

  it('shows whose turn it is while the round is live', () => {
    expect(seatStatus(seat({ isNPC: false, turn: true }), GameStatus.InProgress)?.text).toBe('Your turn');
    expect(seatStatus(seat({ isNPC: true, turn: true }), GameStatus.InProgress)?.text).toBe('Playing');
  });

  it('shows a computer player sitting out', () => {
    expect(seatStatus(seat({ isNPC: true, role: 'bot', isSittingOut: true }), GameStatus.InProgress)?.text).toBe('Sitting out');
  });

  it('has no status for an idle seat', () => {
    expect(seatStatus(seat({}), GameStatus.InProgress)).toBeUndefined();
  });

  it('knows which statuses end the round', () => {
    expect(isRoundOver(GameStatus.InProgress)).toBe(false);
    expect(isRoundOver(GameStatus.RoundOver)).toBe(true);
  });
});

describe('seatTag', () => {
  const seat = (overrides: Partial<IPlayer>): IPlayer => ({ ...playerDefaults, key: 'x', title: 'X', ...overrides });
  const dealer = (overrides: Partial<IPlayer> = {}) => seat({ isNPC: true, role: 'dealer', ...overrides });

  it("is a player's status as it is, or nothing", () => {
    expect(seatTag(seat({ isNPC: true, role: 'bot', isStaying: true }), GameStatus.InProgress)?.text).toBe('Standing');
    expect(seatTag(seat({ isNPC: false }), GameStatus.InProgress)).toBeUndefined();
  });

  it('names the dealer before a game, with nothing else to say', () => {
    expect(seatTag(dealer(), GameStatus.Init)).toEqual({ text: 'Dealer', color: 'subtle', appearance: 'tint' });
  });

  it('shows the dealer waiting while the players play', () => {
    expect(seatTag(dealer(), GameStatus.InProgress)?.text).toBe('Dealer · Waiting');
  });

  it("puts the dealer's status after its name, in the status's own color", () => {
    const playing = seatTag(dealer({ turn: true }), GameStatus.InProgress);
    expect(playing?.text).toBe('Dealer · Playing');
    expect(playing?.color).toBe(seatStatus(dealer({ turn: true }), GameStatus.InProgress)?.color);
    expect(seatTag(dealer({ isStaying: true }), GameStatus.InProgress)?.text).toBe('Dealer · Standing');
    expect(seatTag(dealer({ result: 'win' }), GameStatus.RoundOver)?.text).toBe('Dealer · 🏆 Winner');
    expect(seatTag(dealer({ result: 'push' }), GameStatus.RoundOver)?.text).toBe('Dealer · 🤝 Even');
  });
});
