// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeckState } from '../types';
import { buildCardKeys } from './cards';
import {
  appendCardsToHand,
  clearAllHands,
  createDeck,
  dealCards,
  drawCards,
  emptyHand,
  ensurePlayerHand,
  getPlayerHand,
  getPlayerHandValue,
  getPlayerHands,
  refillDeckCards,
  restoreDeckState,
  selectCard,
  shuffleDeck,
  shuffleKeys,
  splitPlayerHand,
  syncDeckHands,
  unselectCard,
  updateHand,
  updateHandValue,
} from './deck';

afterEach(() => vi.restoreAllMocks());

/** Freeze a value and everything reachable from it so any mutation throws */
const deepFreeze = <T,>(value: T, seen = new Set<unknown>()): T => {
  if (typeof value !== 'object' || value === null || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach((item) => deepFreeze(item, seen));
  return Object.freeze(value);
};

describe('deck', () => {
  it('builds a shuffled shoe of 52 unique cards per deck', () => {
    const single = createDeck();
    expect(single.cardKeys).toHaveLength(52);
    expect([...single.cardKeys].sort()).toEqual([...buildCardKeys()].sort());
    expect(single.drawnKeys).toEqual([]);
    expect(single.selectedKeys).toEqual([]);
    expect(single.playerHands).toEqual({});

    const twoDecks = createDeck(2);
    expect(twoDecks.cardKeys).toHaveLength(104);
    expect(new Set(twoDecks.cardKeys).size).toBe(104);
  });

  it('shuffles deterministically from the supplied rng without mutating input keys', () => {
    const base = deepFreeze(buildCardKeys());
    const first = shuffleKeys(base, () => 0);
    const second = shuffleKeys(base, () => 0);
    expect(first).toEqual(second);
    expect(first).not.toEqual(base);
    expect(shuffleKeys([], () => 0)).toEqual([]);

    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(createDeck(1, () => 0).cardKeys).toEqual(createDeck().cardKeys);
  });

  it('restores a saved state with defensive copies including splitHands', () => {
    const saved: DeckState = deepFreeze({
      cardKeys: ['Club_2', 'Heart_9'],
      drawnKeys: ['Spade_14'],
      selectedKeys: ['Spade_14'],
      playerHands: {
        chris: {
          cards: ['Spade_14', 'Club_10'],
          handValue: { aceAsEleven: 21, aceAsOne: 11, highest: 21 },
          splitHands: [
            {
              cards: ['Spade_14_2', 'Heart_9'],
              handValue: { aceAsEleven: 20, aceAsOne: 10, highest: 20 },
            },
          ],
        },
      },
    });
    const restored = restoreDeckState(saved);
    expect(restored).toEqual(saved);
    expect(restored.cardKeys).not.toBe(saved.cardKeys);
    expect(restored.drawnKeys).not.toBe(saved.drawnKeys);
    expect(restored.selectedKeys).not.toBe(saved.selectedKeys);
    expect(restored.playerHands.chris).not.toBe(saved.playerHands.chris);
    expect(restored.playerHands.chris.cards).not.toBe(saved.playerHands.chris.cards);
    expect(restored.playerHands.chris.handValue).not.toBe(saved.playerHands.chris.handValue);
    expect(restored.playerHands.chris.splitHands?.[0]).not.toBe(saved.playerHands.chris.splitHands?.[0]);
  });

  it('draws from the top, bottom, or at random without mutating input state', () => {
    let deck = deepFreeze<DeckState>({
      cardKeys: ['Club_2', 'Club_3', 'Club_4', 'Club_5', 'Club_6'],
      drawnKeys: [],
      selectedKeys: [],
      playerHands: {},
    });

    // top of the deck is the end of the array
    const topDraw = drawCards(deck, 2, 'top');
    expect(topDraw.drawn).toEqual(['Club_6', 'Club_5']);
    deck = deepFreeze(topDraw.deck);

    const bottomDraw = drawCards(deck, 1, 'bottom');
    expect(bottomDraw.drawn).toEqual(['Club_2']);
    deck = deepFreeze(bottomDraw.deck);
    expect(deck.cardKeys).toEqual(['Club_3', 'Club_4']);
    expect(deck.drawnKeys).toEqual(['Club_6', 'Club_5', 'Club_2']);

    // multi-card random draw removes exactly `count` cards cleanly
    const randomDeck = deepFreeze<DeckState>({
      cardKeys: ['Club_2', 'Club_3', 'Club_4', 'Club_5'],
      drawnKeys: [],
      selectedKeys: [],
      playerHands: {},
    });
    const randomTwo = drawCards(randomDeck, 2, 'random', () => 0);
    expect(randomTwo.drawn).toEqual(['Club_2', 'Club_3']);
    expect(randomTwo.deck.cardKeys).toEqual(['Club_4', 'Club_5']);
    expect(randomTwo.deck.drawnKeys).toEqual(['Club_2', 'Club_3']);

    // fewer than one draws one; empty deck returns original reference and []
    const zeroDraw = drawCards(deck, 0, 'top');
    expect(zeroDraw.drawn).toEqual(['Club_4']);
    const oneLeft = deepFreeze(zeroDraw.deck);
    const lastDraw = drawCards(oneLeft, 1, 'top');
    expect(lastDraw.drawn).toEqual(['Club_3']);

    const empty = deepFreeze(lastDraw.deck);
    const emptyTop = drawCards(empty, 1, 'top');
    expect(emptyTop.drawn).toEqual([]);
    expect(emptyTop.deck).toBe(empty);
    expect(drawCards(empty, 1, 'bottom').drawn).toEqual([]);
  });

  it('deals to named seats, creating missing hands and updating totals', () => {
    const deck = deepFreeze<DeckState>({
      cardKeys: ['Heart_7', 'Club_10', 'Diamond_14', 'Spade_13'],
      drawnKeys: [],
      selectedKeys: [],
      playerHands: { chris: emptyHand() },
    });

    const dealt = dealCards(deck, 2, ['chris', 'dealer']);
    expect(dealt.playerHands.chris.cards).toEqual(['Spade_13', 'Diamond_14']);
    expect(dealt.playerHands.chris.handValue).toEqual({ aceAsEleven: 21, aceAsOne: 11, highest: 21 });
    expect(dealt.playerHands.dealer.cards).toEqual(['Club_10', 'Heart_7']);
    expect(getPlayerHandValue(dealt, 'dealer').highest).toBe(17);
    expect(dealt.cardKeys).toEqual([]);
  });

  it('reads, updates, appends, and splits primary and split hands immutably', () => {
    const split = { cards: ['Club_8', 'Heart_3'], handValue: emptyHand().handValue };
    const deck = deepFreeze<DeckState>({
      cardKeys: ['Heart_5'],
      drawnKeys: [],
      selectedKeys: [],
      playerHands: {
        chris: { cards: ['Spade_8', 'Heart_10'], handValue: emptyHand().handValue, splitHands: [split] },
      },
    });

    expect(getPlayerHands(deck, 'chris')).toHaveLength(2);
    expect(getPlayerHand(deck, 'chris', 1)).toBe(split);
    expect(getPlayerHand(deck, 'chris', 2)).toBeUndefined();
    expect(getPlayerHands(deck, 'nobody')).toEqual([]);
    expect(getPlayerHandValue(deck, 'nobody')).toEqual({ aceAsEleven: 0, aceAsOne: 0, highest: 0 });

    // no-op cases return the exact same deck reference
    expect(updateHand(deck, 'nobody', 0, (h) => ({ ...h, isStaying: true }))).toBe(deck);
    expect(updateHand(deck, 'chris', -1, (h) => ({ ...h, isStaying: true }))).toBe(deck);
    expect(updateHand(deck, 'chris', 5, (h) => ({ ...h, isStaying: true }))).toBe(deck);
    expect(updateHand(deck, 'chris', 0, (h) => h)).toBe(deck);
    expect(updateHand(deck, 'chris', 1, (h) => h)).toBe(deck);

    let updated = deepFreeze(updateHandValue(deck, 'chris', 0));
    updated = deepFreeze(updateHandValue(updated, 'chris', 1));
    expect(getPlayerHand(updated, 'chris', 0)?.handValue.highest).toBe(18);
    expect(getPlayerHand(updated, 'chris', 1)?.handValue.highest).toBe(11);

    const appended = appendCardsToHand(updated, 'chris', ['Heart_5'], 1);
    expect(getPlayerHand(appended, 'chris', 1)?.cards).toEqual(['Club_8', 'Heart_3', 'Heart_5']);
    expect(getPlayerHand(appended, 'chris', 1)?.handValue.highest).toBe(16);

    const newSeatAppended = appendCardsToHand(updated, 'ogion', ['Club_9']);
    expect(getPlayerHand(newSeatAppended, 'ogion')?.cards).toEqual(['Club_9']);
    expect(getPlayerHand(newSeatAppended, 'ogion')?.handValue.highest).toBe(9);

    // split normal pair
    const pairDeck = deepFreeze<DeckState>({
      cardKeys: [],
      drawnKeys: [],
      selectedKeys: [],
      playerHands: {
        chris: { cards: ['Club_8', 'Heart_8'], handValue: { aceAsEleven: 16, aceAsOne: 16, highest: 16 } },
      },
    });
    const normalSplit = splitPlayerHand(pairDeck, 'chris', 0, 25);
    expect(normalSplit.isSplitAces).toBe(false);
    expect(getPlayerHands(normalSplit.deck, 'chris')).toMatchObject([
      { cards: ['Club_8'], stake: 25, isSplit: true, handValue: { highest: 8 } },
      { cards: ['Heart_8'], stake: 25, isSplit: true, handValue: { highest: 8 } },
    ]);

    // split aces
    const acesDeck = deepFreeze<DeckState>({
      cardKeys: [],
      drawnKeys: [],
      selectedKeys: [],
      playerHands: {
        chris: { cards: ['Club_14', 'Heart_14'], handValue: { aceAsEleven: 12, aceAsOne: 2, highest: 12 } },
      },
    });
    const acesSplit = splitPlayerHand(acesDeck, 'chris', 0, 50);
    expect(acesSplit.isSplitAces).toBe(true);
    expect(getPlayerHands(acesSplit.deck, 'chris').every((hand) => hand.isSplitAces && hand.isSplit)).toBe(true);

    // cannot split a 1-card or missing hand
    const oneCard = splitPlayerHand(pairDeck, 'nobody', 0, 25);
    expect(oneCard).toEqual({ deck: pairDeck, isSplitAces: false });
  });

  it('ensures, clears, and syncs playerHands with structural sharing', () => {
    const deck = deepFreeze(dealCards(createDeck(1, () => 0.5), 2, ['chris', 'ogion', 'dealer']));
    expect(ensurePlayerHand(deck, 'chris')).toBe(deck);

    const withShevek = ensurePlayerHand(deck, 'shevek');
    expect(withShevek.playerHands.shevek.cards).toEqual([]);
    expect(withShevek.playerHands.chris).toBe(deck.playerHands.chris);

    const cleared = clearAllHands(deck);
    expect(Object.keys(cleared.playerHands)).toEqual(['chris', 'ogion', 'dealer']);
    expect(cleared.playerHands.chris.cards).toEqual([]);

    const synced = syncDeckHands(deck, ['shevek', 'chris', 'dealer']);
    expect(Object.keys(synced.playerHands)).toEqual(['shevek', 'chris', 'dealer']);
    expect(synced.playerHands.chris).toBe(deck.playerHands.chris);
    expect(synced.playerHands.dealer).toBe(deck.playerHands.dealer);
    expect(synced.playerHands.ogion).toBeUndefined();
    expect(synced.playerHands.shevek.cards).toEqual([]);
  });

  it('selects and unselects cards without duplicates or unnecessary clones', () => {
    const deck = deepFreeze(createDeck(1, () => 0.1));
    const s1 = deepFreeze(selectCard(deck, 'Spade_8'));
    expect(s1.selectedKeys).toEqual(['Spade_8']);
    expect(selectCard(s1, 'Spade_8')).toBe(s1);

    const s2 = deepFreeze(selectCard(s1, 'Club_2'));
    expect(s2.selectedKeys).toEqual(['Spade_8', 'Club_2']);

    const u1 = deepFreeze(unselectCard(s2, 'Club_2'));
    expect(u1.selectedKeys).toEqual(['Spade_8']);
    expect(unselectCard(u1, 'Club_2')).toBe(u1);
  });

  it('shuffles and refills shoes while excluding cards held in primary and split hands', () => {
    const empty = deepFreeze<DeckState>({
      cardKeys: [],
      drawnKeys: ['Club_2'],
      selectedKeys: [],
      playerHands: {},
    });
    const rebuilt = shuffleDeck(empty, 2, () => 0.25);
    expect(rebuilt.cardKeys).toHaveLength(104);

    const custom = deepFreeze<DeckState>({
      cardKeys: ['Club_2', 'Club_3', 'Club_4'],
      drawnKeys: [],
      selectedKeys: [],
      playerHands: {},
    });
    const shuffled = shuffleDeck(custom, 1, () => 0);
    expect(shuffled.cardKeys).not.toEqual(custom.cardKeys);
    expect([...shuffled.cardKeys].sort()).toEqual(['Club_2', 'Club_3', 'Club_4']);

    const splitHeld = deepFreeze<DeckState>({
      cardKeys: [],
      drawnKeys: [],
      selectedKeys: [],
      playerHands: {
        chris: {
          cards: ['Diamond_8', 'Spade_10'],
          handValue: emptyHand().handValue,
          splitHands: [
            { cards: ['Diamond_8_2', 'Club_9'], handValue: emptyHand().handValue },
          ],
        },
        dealer: {
          cards: ['Club_7', 'Heart_10'],
          handValue: emptyHand().handValue,
        },
      },
    });
    const refilled = refillDeckCards(splitHeld, 2, () => 0.5);
    const held = ['Diamond_8', 'Spade_10', 'Diamond_8_2', 'Club_9', 'Club_7', 'Heart_10'];
    expect(refilled.cardKeys).toHaveLength(104 - held.length);
    expect(new Set([...held, ...refilled.cardKeys]).size).toBe(104);
    expect(held.every((key) => !refilled.cardKeys.includes(key))).toBe(true);
  });
});
