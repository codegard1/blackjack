import { describe, expect, it } from 'vitest';
import { BOTS, DEALER } from '../characters';
import { createGameState } from '../context';
import { STARTING_BANK } from '../definitions';
import { GameAction, GameStatus } from '../enums';
import { gameReducer } from './gameReducer';
import { GameSnapshot, GameState, PlayerSnapshot } from '../types';
import { diffAnnouncements, snapshotGame } from './announcements';
import { decideSeatMove } from './round';
import { isRoundOver, isSeatLoser, seatStatus, seatTag } from './seatStatus';
import { seededRandom, simulateHistory } from './simulate';
import { playerDefaults } from '../definitions';
import { GameReducerAction, IPlayer, IPlayerOptions } from '../interfaces';

const player = (overrides: Partial<PlayerSnapshot> & Pick<PlayerSnapshot, 'key' | 'title' | 'isNPC'>): PlayerSnapshot => ({
  cardCount: 2,
  total: 15,
  isBusted: false,
  isStaying: false,
  isBlackjack: false,
  isSittingOut: false,
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

    expect(diffAnnouncements(before, after, true)).toEqual([{
      title: '+$50 added to the pot',
      subtitle: 'Pot: $50',
      tone: 'brand',
      category: 'pot',
      kind: 'pot-contribution',
    }]);
  });

  it('announces money added to the pot that no wager accounts for as one pooled amount', () => {
    const before = snapshot({ pot: 50, totalPotContributions: 50 });
    const after = snapshot({ pot: 75, totalPotContributions: 75 });

    expect(diffAnnouncements(before, after, true)[0]).toMatchObject({
      title: '+$25 added to the pot',
      subtitle: 'Pot: $75',
      category: 'pot',
      kind: 'pot-contribution',
    });
  });

  describe('wagers and pot merges', () => {
    const chrisWager = { id: 7, name: 'Chris', description: 'wagered $25', amount: 25 };

    it("announces a single wager in the player's name, with the pot after it", () => {
      const before = snapshot({ pot: 50, totalPotContributions: 50 });
      const after = snapshot({ pot: 75, totalPotContributions: 75, wagers: [chrisWager] });

      expect(diffAnnouncements(before, after, true)).toEqual([{
        title: 'Chris wagered $25',
        subtitle: 'Pot: $75',
        tone: 'brand',
        category: 'pot',
        kind: 'pot-contribution',
        playerKey: 'chris',
      }]);
    });

    it('words a double down and a split the way the activity log does', () => {
      const before = snapshot({ pot: 50, totalPotContributions: 50 });
      const doubled = snapshot({ pot: 100, totalPotContributions: 100, wagers: [{ id: 8, name: 'Chris', description: 'doubled down for $50', amount: 50 }] });
      const split = snapshot({ pot: 100, totalPotContributions: 100, wagers: [{ id: 9, name: 'Chris', description: 'split for $50', amount: 50 }] });

      expect(diffAnnouncements(before, doubled, true)[0]).toMatchObject({ title: 'Chris doubled down for $50', subtitle: 'Pot: $100', category: 'pot', playerKey: 'chris' });
      expect(diffAnnouncements(before, split, true)[0]).toMatchObject({ title: 'Chris split for $50', category: 'pot', playerKey: 'chris' });
    });

    it('merges multiple wagers made in one change into a single pot toast', () => {
      const earlier = { id: 3, name: 'Ogion', description: 'wagered $25', amount: 25 };
      const before = snapshot({ pot: 100, totalPotContributions: 100, wagers: [earlier] });
      const after = snapshot({
        pot: 150,
        totalPotContributions: 150,
        wagers: [earlier, chrisWager, { id: 8, name: 'Ogion', description: 'wagered $25', amount: 25 }],
      });

      expect(diffAnnouncements(before, after, true)).toEqual([{
        title: '+$50 added to the pot',
        subtitle: 'Pot: $150',
        tone: 'brand',
        category: 'pot',
        kind: 'pot-contribution',
      }]);
    });

    it('merges start-of-round antes and computer wagers into one pot toast', () => {
      const before = snapshot({ pot: 0, totalPotContributions: 0 });
      const after = snapshot({
        pot: 150,
        totalPotContributions: 150,
        wagers: [
          { id: 4, name: 'Ogion', description: 'wagered $25', amount: 25 },
          { id: 5, name: 'Shevek', description: 'wagered $50', amount: 50 },
        ],
      });

      expect(diffAnnouncements(before, after, true)).toEqual([{
        title: '+$150 added to the pot',
        subtitle: 'Pot: $150',
        tone: 'brand',
        category: 'pot',
        kind: 'pot-contribution',
      }]);
    });

    it('merges real start-of-round antes and computer wagers across a full table into one pot toast', () => {
      const prev = gameReducer(createGameState(), {
        type: GameAction.NewGame,
        players: [
          { key: 'chris', title: 'Chris', isNPC: false, role: 'human', id: 1, bank: STARTING_BANK },
          ...BOTS.map((bot, index): IPlayerOptions => ({ key: bot.id, title: bot.name, isNPC: true, role: 'bot', id: index + 2, bank: STARTING_BANK })),
          { key: DEALER.id, title: DEALER.name, isNPC: true, role: 'dealer', id: 6, bank: STARTING_BANK },
        ],
        seed: 7,
      });
      const next = gameReducer(prev, { type: GameAction.EvaluateGame, seed: 7 });
      const announcements = diffAnnouncements(snapshotGame(prev), snapshotGame(next), false);

      expect(announcements).toEqual([{
        title: `+$${next.pot} added to the pot`,
        subtitle: `Pot: $${next.pot}`,
        tone: 'brand',
        category: 'pot',
        kind: 'pot-contribution',
      }]);
    });

    it('merges antes and wagers after the log starts over for a new game', () => {
      const before = snapshot({ pot: 200, totalPotContributions: 300, wagers: [{ ...chrisWager, id: 40 }] });
      const after = snapshot({ pot: 50, totalPotContributions: 50, wagers: [{ ...chrisWager, id: 2 }] });

      expect(diffAnnouncements(before, after, true)).toEqual([{
        title: '+$50 added to the pot',
        subtitle: 'Pot: $50',
        tone: 'brand',
        category: 'pot',
        kind: 'pot-contribution',
      }]);
    });

    it('still names a single wager when no seat has the logged name', () => {
      const before = snapshot({ pot: 50, totalPotContributions: 50 });
      const after = snapshot({ pot: 75, totalPotContributions: 75, wagers: [{ ...chrisWager, name: 'Someone' }] });

      expect(diffAnnouncements(before, after, true)[0]).toMatchObject({ title: 'Someone wagered $25', category: 'pot', playerKey: undefined });
    });
  });

  describe('removed toasts (deals, hits, stands, turn changes)', () => {
    it('does not announce turn changes for human, computer, or dealer seats', () => {
      const beforeStart = snapshot({ gameStatus: GameStatus.Init, controllingPlayer: undefined });
      const chrisTurn = snapshot({
        controllingPlayer: 'chris',
      }, [
        player({ key: 'chris', title: 'Chris', isNPC: false }),
        player({ key: 'ogion', title: 'Ogion', isNPC: true, role: 'bot' }),
        player({ key: 'dealer', title: 'Faxe', isNPC: true }),
      ]);
      const ogionTurn = { ...chrisTurn, controllingPlayer: 'ogion' };
      const dealerTurn = { ...chrisTurn, controllingPlayer: 'dealer' };

      expect(diffAnnouncements(beforeStart, chrisTurn, true)).toEqual([]);
      expect(diffAnnouncements(chrisTurn, ogionTurn, true)).toEqual([]);
      expect(diffAnnouncements(ogionTurn, dealerTurn, true)).toEqual([]);
    });

    it('does not announce initial deals or replacement deals on a new round', () => {
      const empty = snapshot({ round: 1 }, [
        player({ key: 'chris', title: 'Chris', isNPC: false, cardCount: 0, total: 0 }),
        player({ key: 'dealer', title: 'Dealer', isNPC: true, role: 'dealer', cardCount: 0, total: 0 }),
      ]);
      const dealt = snapshot({ round: 1 }, [
        player({ key: 'chris', title: 'Chris', isNPC: false, cardCount: 2, total: 16 }),
        player({ key: 'dealer', title: 'Dealer', isNPC: true, role: 'dealer', cardCount: 2, total: 18 }),
      ]);
      const nextRound = snapshot({ round: 2 }, [
        player({ key: 'chris', title: 'Chris', isNPC: false, cardCount: 2, total: 15 }),
        player({ key: 'dealer', title: 'Dealer', isNPC: true, role: 'dealer', cardCount: 2, total: 17 }),
      ]);

      expect(diffAnnouncements(empty, dealt, false)).toEqual([]);
      expect(diffAnnouncements(dealt, nextRound, false)).toEqual([]);
    });

    it('does not announce non-busting hits or stands for human, computer, or dealer seats', () => {
      const players = [
        player({ key: 'chris', title: 'Chris', isNPC: false, cardCount: 2, total: 15 }),
        player({ key: 'ogion', title: 'Ogion', isNPC: true, role: 'bot', cardCount: 2, total: 12 }),
        player({ key: 'dealer', title: 'Faxe', isNPC: true, role: 'dealer', cardCount: 2, total: 12 }),
      ];
      const chrisHits = withPlayer(snapshot({ controllingPlayer: 'chris' }, players), 'chris', { cardCount: 3, total: 20 });
      expect(diffAnnouncements(snapshot({ controllingPlayer: 'chris' }, players), chrisHits, false)).toEqual([]);

      const ogionTurn = snapshot({ controllingPlayer: 'ogion' }, players);
      const ogionHits = withPlayer(ogionTurn, 'ogion', { cardCount: 3, total: 15 });
      const ogionStands = withPlayer({ ...ogionHits, controllingPlayer: 'dealer' }, 'ogion', { isStaying: true });
      expect(diffAnnouncements(ogionTurn, ogionHits, false)).toEqual([]);
      expect(diffAnnouncements(ogionHits, ogionStands, false)).toEqual([]);

      const dealerTurn = snapshot({ controllingPlayer: 'dealer' }, players);
      const dealerHits = withPlayer(dealerTurn, 'dealer', { cardCount: 3, total: 16 });
      const dealerStands = withPlayer(dealerHits, 'dealer', { isStaying: true });
      expect(diffAnnouncements(dealerTurn, dealerHits, true)).toEqual([]);
      expect(diffAnnouncements(dealerHits, dealerStands, true)).toEqual([]);
    });
  });

  describe('sitting out and work notices', () => {
    it('announces one player sitting out in the pot category', () => {
      const before = snapshot({ round: 1 });
      const after = withPlayer(snapshot({ round: 2 }), 'chris', { isSittingOut: true });

      expect(diffAnnouncements(before, after, true)).toEqual([{
        title: 'Chris sits out this round',
        tone: 'neutral',
        category: 'pot',
        playerKey: 'chris',
      }]);
    });

    it('merges multiple players sitting out at once into one toast', () => {
      const base = [
        player({ key: 'chris', title: 'Chris', isNPC: false }),
        player({ key: 'ogion', title: 'Ogion', isNPC: true, role: 'bot' }),
        player({ key: 'shevek', title: 'Shevek', isNPC: true, role: 'bot' }),
        player({ key: 'dealer', title: 'Faxe', isNPC: true }),
      ];
      const before = snapshot({ round: 1 }, base);
      const twoOut = withPlayer(withPlayer(snapshot({ round: 2 }, base), 'chris', { isSittingOut: true }), 'ogion', { isSittingOut: true });
      const threeOut = withPlayer(twoOut, 'shevek', { isSittingOut: true });

      expect(diffAnnouncements(before, twoOut, true)).toEqual([{
        title: 'Chris and Ogion sit out this round',
        tone: 'neutral',
        category: 'pot',
      }]);
      expect(diffAnnouncements(before, threeOut, true)).toEqual([{
        title: 'Chris, Ogion and Shevek sit out this round',
        tone: 'neutral',
        category: 'pot',
      }]);
    });

    it('announces consecutive rounds sitting out, and waits until the next round when marked after a round ends', () => {
      const ended = snapshot({ gameStatus: GameStatus.RoundOver, controllingPlayer: undefined, round: 1 });
      const markedBetweenHands = withPlayer(ended, 'chris', { isSittingOut: true });
      expect(diffAnnouncements(ended, markedBetweenHands, true)).toEqual([]);

      const round2 = withPlayer(snapshot({ gameStatus: GameStatus.InProgress, round: 2 }), 'chris', { isSittingOut: true });
      expect(diffAnnouncements(markedBetweenHands, round2, true)).toEqual([{
        title: 'Chris sits out this round',
        tone: 'neutral',
        category: 'pot',
        playerKey: 'chris',
      }]);

      const round3 = withPlayer(snapshot({ gameStatus: GameStatus.InProgress, round: 3 }), 'chris', { isSittingOut: true });
      expect(diffAnnouncements(round2, round3, true)).toEqual([{
        title: 'Chris sits out this round',
        tone: 'neutral',
        category: 'pot',
        playerKey: 'chris',
      }]);
    });

    it('tags work notices under pot and does not duplicate a sit-out toast for away-working bots', () => {
      const base = [
        player({ key: 'chris', title: 'Chris', isNPC: false }),
        player({ key: 'ogion', title: 'Ogion', isNPC: true, role: 'bot' }),
        player({ key: 'dealer', title: 'Faxe', isNPC: true }),
      ];
      const before = snapshot({ round: 1, workNotices: [] }, base);
      const after = withPlayer(
        snapshot({
          round: 2,
          workNotices: [{ id: 10, name: 'Ogion', description: 'left to work: herding goats on gont' }],
        }, base),
        'ogion',
        { isSittingOut: true, awayTask: 'herding-goats' },
      );

      expect(diffAnnouncements(before, after, true)).toEqual([{
        title: 'Ogion left to work: herding goats on gont',
        tone: 'neutral',
        category: 'pot',
        playerKey: 'ogion',
      }]);
    });
  });

  describe('gameplay outcomes (busts, blackjacks, results)', () => {
    it('tracks draws and totals on the active split hand and announces a split-hand bust', () => {
      const state = gameReducer(createGameState(), { type: GameAction.NewGame, playerKeys: ['chris', 'ogion', 'dealer'] });
      state.controllingPlayer = 'chris';
      state.activeHandIndex = 1;
      state.deck.playerHands.chris.cards = ['Club_10', 'Diamond_7'];
      state.deck.playerHands.chris.splitHands = [{
        cards: ['Heart_5', 'Club_2'],
        handValue: { aceAsEleven: 7, aceAsOne: 7, highest: 7 },
      }];
      const before = snapshotGame(state);

      state.deck.hand('chris', 1)?.cards.push('Spade_10');
      state.deck.updateHandValue('chris', 1);
      const afterHit = snapshotGame(state);
      expect(afterHit.players.find((p) => p.key === 'chris')).toMatchObject({ cardCount: 3, total: 17 });
      expect(diffAnnouncements(before, afterHit, false)).toEqual([]);

      state.deck.hand('chris', 1)?.cards.push('Diamond_8');
      state.deck.updateHandValue('chris', 1);
      state.playerStore.player('chris').isBusted = true;
      const afterBust = snapshotGame(state);

      expect(afterBust.players.find((p) => p.key === 'chris')).toMatchObject({
        cardCount: 4,
        total: 25,
        isBusted: true,
      });
      expect(diffAnnouncements(afterHit, afterBust, false)).toEqual([{
        title: 'Chris busts!',
        subtitle: 'Total 25',
        tone: 'danger',
        category: 'gameplay',
        playerKey: 'chris',
      }]);
    });

    it('announces a mid-round bust with only the total (hiding the dealer total while face down)', () => {
      const players = [
        player({ key: 'chris', title: 'Chris', isNPC: false }),
        player({ key: 'ogion', title: 'Ogion', isNPC: true, role: 'bot', cardCount: 2, total: 14 }),
        player({ key: 'dealer', title: 'Faxe', isNPC: true, cardCount: 2, total: 14 }),
      ];
      const before = snapshot({ controllingPlayer: 'ogion' }, players);
      const after = withPlayer(before, 'ogion', { cardCount: 3, total: 24, isBusted: true });

      expect(diffAnnouncements(before, after, false)).toEqual([{
        title: 'Ogion busts!',
        subtitle: 'Total 24',
        tone: 'danger',
        category: 'gameplay',
        playerKey: 'ogion',
      }]);

      const dealerBefore = snapshot({ controllingPlayer: 'dealer' }, players);
      const dealerAfter = withPlayer(dealerBefore, 'dealer', { cardCount: 3, total: 24, isBusted: true });
      expect(diffAnnouncements(dealerBefore, dealerAfter, false)).toEqual([{
        title: 'Faxe busts!',
        subtitle: undefined,
        tone: 'danger',
        category: 'gameplay',
        playerKey: 'dealer',
      }]);
    });

    it('skips the separate bust toast when a bust ends the round, and shows the dealer bust total on the result', () => {
      const beforeDealerBust = withPlayer(snapshot({ controllingPlayer: 'dealer' }), 'dealer', { cardCount: 2, total: 14 });
      const afterDealerBust = withPlayer(roundOver({ result: 'win' }), 'dealer', { cardCount: 3, total: 24, isBusted: true, result: 'loss' });
      expect(diffAnnouncements(beforeDealerBust, afterDealerBust, true)).toEqual([
        { title: 'Chris wins!', subtitle: 'Dealer busted', tone: 'success', category: 'gameplay', playerKey: 'chris', kind: 'result' },
        { title: 'Dealer loses', subtitle: 'Busted · Total 24', tone: 'danger', category: 'gameplay', playerKey: 'dealer', kind: 'result' },
      ]);

      const beforeHumanBust = snapshot();
      const afterHumanBust = withPlayer(roundOver({ cardCount: 3, total: 23, isBusted: true, result: 'loss' }), 'dealer', { result: 'win' });
      expect(diffAnnouncements(beforeHumanBust, afterHumanBust, true)).toEqual([
        { title: 'Chris loses', subtitle: 'Busted', tone: 'danger', category: 'gameplay', playerKey: 'chris', kind: 'result' },
        { title: 'Dealer wins!', tone: 'success', category: 'gameplay', playerKey: 'dealer', kind: 'result' },
      ]);
    });

    it('announces a mid-round natural blackjack (merged if several), and skips it when the round ends in the same action', () => {
      const table = [
        player({ key: 'chris', title: 'Chris', isNPC: false }),
        player({ key: 'ogion', title: 'Ogion', isNPC: true, role: 'bot' }),
        player({ key: 'dealer', title: 'Faxe', isNPC: true }),
      ];
      const before = snapshot({ gameStatus: GameStatus.InProgress, round: 1 }, table);
      const oneNatural = withPlayer(before, 'chris', { isBlackjack: true, result: 'blackjack' });
      expect(diffAnnouncements(before, oneNatural, false)).toEqual([
        { title: 'Chris has blackjack!', tone: 'success', category: 'gameplay', playerKey: 'chris' },
      ]);

      const twoNaturals = withPlayer(oneNatural, 'ogion', { isBlackjack: true, result: 'blackjack' });
      expect(diffAnnouncements(before, twoNaturals, false)).toEqual([
        { title: 'Chris and Ogion have blackjack!', tone: 'success', category: 'gameplay' },
      ]);

      // When a natural ends the round immediately, only the result toast is shown
      const afterRoundEnded = roundOver({ isBlackjack: true, result: 'blackjack' }, { round: 1 });
      expect(diffAnnouncements(snapshot({ gameStatus: GameStatus.InProgress, round: 1 }), afterRoundEnded, true)).toEqual([
        { title: 'Chris wins!', subtitle: 'Blackjack', tone: 'success', category: 'gameplay', playerKey: 'chris', kind: 'result' },
      ]);
    });

    it('announces a result even when the previous round had already ended', () => {
      // a natural blackjack can end round 2 in the same action that starts it
      const before = snapshot({ gameStatus: GameStatus.RoundOver, controllingPlayer: undefined, round: 1 });
      const after = roundOver({ isBlackjack: true, result: 'blackjack' }, { round: 2 });
      expect(diffAnnouncements(before, after, true).map((a) => a.title)).toEqual(['Chris wins!']);
    });

    it('announces a push in the seat\'s name', () => {
      const before = snapshot();
      const after = roundOver({ result: 'push' });
      expect(diffAnnouncements(before, after, true)).toEqual([
        { title: 'Chris pushes', subtitle: 'Stake returned', tone: 'info', category: 'gameplay', playerKey: 'chris', kind: 'result' },
      ]);
    });
  });

  describe('results at the end of a round (human and dealer only)', () => {
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

    it('tells only the human seat and the dealer in turn order, skipping computer seats', () => {
      const next = ended({ chris: { result: 'loss' }, ogion: { result: 'loss', isBusted: true }, shevek: { result: 'win' }, dealer: { result: 'push' } });
      expect(results(next).map((a) => [a.title, a.playerKey, a.category])).toEqual([
        ['Chris loses', 'chris', 'gameplay'],
        ['Faxe breaks even', 'dealer', 'gameplay'],
      ]);
    });

    it('says why the human won or lost, and includes the dealer bust total', () => {
      const next = ended({
        chris: { result: 'loss' },
        ogion: { result: 'loss', isBusted: true },
        shevek: { result: 'win' },
        dealer: { result: 'win' },
      });
      expect(results(next).map((a) => a.subtitle)).toEqual(['19 to 18', undefined]);

      const dealerBusted = ended({ chris: { result: 'win' }, dealer: { result: 'loss', isBusted: true, total: 23 } });
      expect(results(dealerBusted).map((a) => a.subtitle)).toEqual(['Faxe busted', 'Busted · Total 23']);
    });

    it('credits a loss to the dealer having blackjack', () => {
      const natural = ended({ chris: { result: 'loss' }, dealer: { result: 'win', isBlackjack: true, total: 21 } });
      expect(results(natural)[0]).toMatchObject({ title: 'Chris loses', subtitle: 'Faxe has blackjack', category: 'gameplay' });
    });

    it('colors each result by how it went for that seat, the dealer included', () => {
      const next = ended({ chris: { result: 'win' }, ogion: { result: 'push' }, shevek: { result: 'loss' }, dealer: { result: 'loss' } });
      expect(results(next).map((a) => a.tone)).toEqual(['success', 'danger']);
    });

    it('skips the human seat when sitting out (no result) and falls back when neither seat has a result', () => {
      const humanSatOut = ended({ shevek: { result: 'loss' }, dealer: { result: 'win' } });
      expect(results(humanSatOut).map((a) => a.playerKey)).toEqual(['dealer']);

      const nobodyPlayed = ended({});
      expect(diffAnnouncements(snapshot({ controllingPlayer: 'dealer' }, table), nobodyPlayed, true))
        .toEqual([{ title: 'Round over', tone: 'info', category: 'gameplay' }]);
    });
  });

  describe('full-table toast budget', () => {
    it('never queues more than 2 gameplay toasts or 1 pot-contribution toast across simulated computer rounds', () => {
      let maxGameplay = 0;
      let maxPotContribution = 0;
      let steps = 0;

      simulateHistory({
        rounds: 200,
        rng: seededRandom(42),
        onStep: (prev, next) => {
          steps += 1;
          const items = diffAnnouncements(snapshotGame(prev), snapshotGame(next), isRoundOver(next.gameStatus));
          const gameplay = items.filter((item) => item.category === 'gameplay');
          const potContributions = items.filter((item) => item.kind === 'pot-contribution');
          maxGameplay = Math.max(maxGameplay, gameplay.length);
          maxPotContribution = Math.max(maxPotContribution, potContributions.length);
          expect(gameplay.length).toBeLessThanOrEqual(2);
          expect(potContributions.length).toBeLessThanOrEqual(1);
        },
      });

      expect(steps).toBeGreaterThan(200);
      expect(maxGameplay).toBeLessThanOrEqual(2);
      expect(maxPotContribution).toBeLessThanOrEqual(1);
    });

    it('never queues more than 2 gameplay toasts or 1 pot-contribution toast across full 6-seat rounds with a human', () => {
      const rng = seededRandom(7);
      const realRandom = Math.random;
      Math.random = rng;
      let maxGameplay = 0;
      let maxPotContribution = 0;
      let steps = 0;

      const fullTableSeats = (): IPlayerOptions[] => [
        { key: 'chris', title: 'Chris', isNPC: false, role: 'human', id: 1, bank: STARTING_BANK },
        ...BOTS.map((bot, index): IPlayerOptions => ({
          key: bot.id, title: bot.name, isNPC: true, role: 'bot', id: index + 2, bank: STARTING_BANK,
        })),
        { key: DEALER.id, title: DEALER.name, isNPC: true, role: 'dealer', id: BOTS.length + 2, bank: STARTING_BANK },
      ];

      const step = (prev: GameState, action: GameReducerAction): GameState => {
        const next = gameReducer(prev, action);
        steps += 1;
        const items = diffAnnouncements(snapshotGame(prev), snapshotGame(next), isRoundOver(next.gameStatus));
        const gameplay = items.filter((item) => item.category === 'gameplay');
        const potContributions = items.filter((item) => item.kind === 'pot-contribution');
        maxGameplay = Math.max(maxGameplay, gameplay.length);
        maxPotContribution = Math.max(maxPotContribution, potContributions.length);
        expect(gameplay.length).toBeLessThanOrEqual(2);
        expect(potContributions.length).toBeLessThanOrEqual(1);
        return next;
      };

      try {
        let roundsPlayed = 0;
        while (roundsPlayed < 200) {
          let state = step(createGameState(), { type: GameAction.NewGame, players: fullTableSeats() });
          state = step(state, { type: GameAction.EvaluateGame });

          for (let inSession = 0; inSession < 50 && roundsPlayed < 200; inSession++) {
            state = step(state, { type: GameAction.Deal });
            for (let moves = 0; state.gameStatus === GameStatus.InProgress; moves++) {
              const key = state.controllingPlayer;
              expect(key).toBeTruthy();
              expect(moves).toBeLessThan(200);
              const move = decideSeatMove(state, key!, rng, state.activeHandIndex);
              state = move === 'hit'
                ? step(state, { type: GameAction.Draw, playerKey: key, handIndex: state.activeHandIndex, deckSide: 'top', numberOfCards: 1 })
                : move === 'double'
                  ? step(state, { type: GameAction.DoubleDown, playerKey: key, handIndex: state.activeHandIndex })
                  : move === 'split'
                    ? step(state, { type: GameAction.Split, playerKey: key, handIndex: state.activeHandIndex })
                    : step(state, { type: GameAction.Stay, playerKey: key, handIndex: state.activeHandIndex });
            }
            state = step(state, { type: GameAction.EvaluateGame });
            roundsPlayed += 1;
          }
        }
      } finally {
        Math.random = realRandom;
      }

      expect(steps).toBeGreaterThan(200);
      expect(maxGameplay).toBe(2);
      expect(maxPotContribution).toBe(1);
    });
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
