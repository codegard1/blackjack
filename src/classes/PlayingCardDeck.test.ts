// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayingCard } from './PlayingCard';
import { PlayingCardDeck } from './PlayingCardDeck';

afterEach(() => vi.restoreAllMocks());

const cardsOf = (...keys: string[]) => keys.map((key) => new PlayingCard(key));

describe('PlayingCardDeck', () => {
  it('builds a shuffled shoe of 52 unique cards per deck', () => {
    expect(PlayingCardDeck.cardKeys()).toHaveLength(52);
    expect(new Set(PlayingCardDeck.cardKeys(6)).size).toBe(312);
    // the first deck keeps plain keys; later decks carry a copy suffix
    expect(PlayingCardDeck.cardKeys(2)).toEqual(expect.arrayContaining(['Spade_14', 'Spade_14_2']));

    const deck = new PlayingCardDeck();
    expect(deck.length).toBe(52);
    expect([...deck.cardKeys].sort()).toEqual([...PlayingCardDeck.cardKeys()].sort());
    expect(deck.drawnKeys).toEqual([]);
    expect(deck.playerHands).toEqual({});
    expect(new PlayingCardDeck(undefined, 2).length).toBe(104);
  });

  it('shuffles with the random numbers it is given', () => {
    // a source that always answers 0 moves every card the same way, so two shuffles of one order agree
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const first = new PlayingCardDeck();
    const second = new PlayingCardDeck();
    expect(first.cardKeys).toEqual(second.cardKeys);
    expect(first.cardKeys).not.toEqual(PlayingCardDeck.cardKeys());
  });

  it('restores a saved state as it was', () => {
    const state = {
      cardKeys: ['Club_2', 'Heart_9'],
      drawnKeys: ['Spade_14'],
      selectedKeys: ['Spade_14'],
      playerHands: { chris: { cards: ['Spade_14'], handValue: { aceAsEleven: 11, aceAsOne: 1, highest: 11 } } },
    };
    const deck = new PlayingCardDeck(state, 1);
    expect(deck.state).toEqual(state);
    expect(deck.length).toBe(2);
    expect(deck.has('Heart_9')).toBe(true);
    expect(deck.has('Spade_14')).toBe(false);
  });

  it('draws from the top, the bottom or at random, and remembers what was drawn', () => {
    const deck = new PlayingCardDeck();
    deck.cards = cardsOf('Club_2', 'Club_3', 'Club_4', 'Club_5', 'Club_6');

    // the top of the deck is the end of the list
    expect(deck.draw(2)).toEqual(['Club_6', 'Club_5']);
    expect(deck.drawFromBottomOfDeck(1)).toEqual(['Club_2']);
    expect(deck.cardKeys).toEqual(['Club_3', 'Club_4']);
    expect(deck.drawnKeys).toEqual(['Club_6', 'Club_5', 'Club_2']);

    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(deck.drawRandom(1)).toEqual(['Club_3']);
    expect(deck.cardKeys).toEqual(['Club_4']);

    // fewer than one is one; an empty deck gives nothing
    expect(deck.draw(0)).toEqual(['Club_4']);
    expect(deck.draw(1)).toEqual([]);
    expect(deck.drawFromBottomOfDeck(1)).toEqual([]);
  });

  it('deals to the named seats, creating a hand where there is none, and keeps the totals', () => {
    const deck = new PlayingCardDeck();
    deck.cards = cardsOf('Heart_7', 'Club_10', 'Diamond_14', 'Spade_13');
    deck.newPlayerHand('chris');

    deck.deal(2, ['chris', 'dealer']);
    expect(deck.playerHands.chris.cards).toEqual(['Spade_13', 'Diamond_14']);
    expect(deck.playerHands.chris.handValue).toEqual({ aceAsEleven: 21, aceAsOne: 11, highest: 21 });
    expect(deck.playerHands.dealer.cards).toEqual(['Club_10', 'Heart_7']);
    expect(deck.getHandValue('dealer').highest).toBe(17);
    expect(deck.length).toBe(0);
  });

  it('draws one card for a hit and updates the total', () => {
    const deck = new PlayingCardDeck();
    deck.cards = cardsOf('Heart_5');
    deck.newPlayerHand('chris');
    expect(deck.hit('chris')).toBe('Heart_5');
    expect(deck.getHand('chris')).toEqual({ cards: ['Heart_5'], handValue: { aceAsEleven: 5, aceAsOne: 5, highest: 5 } });
  });

  it('reads split hands as hands of their own, after the first', () => {
    const deck = new PlayingCardDeck();
    const split = { cards: ['Club_8', 'Heart_3'], handValue: { aceAsEleven: 0, aceAsOne: 0, highest: 0 } };
    deck.playerHands.chris = { cards: ['Spade_8', 'Heart_10'], handValue: { aceAsEleven: 0, aceAsOne: 0, highest: 0 }, splitHands: [split] };

    expect(deck.getHands('chris')).toHaveLength(2);
    expect(deck.hand('chris', 1)).toBe(split);
    expect(deck.hand('chris', 2)).toBeUndefined();
    expect(deck.getHands('nobody')).toEqual([]);
    expect(deck.getHand('nobody')).toEqual({ cards: [], handValue: { aceAsEleven: 0, aceAsOne: 0, highest: 0 } });

    deck.updateHandValue('chris');
    deck.updateHandValue('chris', 1);
    expect(deck.hand('chris')?.handValue.highest).toBe(18);
    expect(split.handValue.highest).toBe(11);
    // a hand that does not exist is left alone
    expect(() => deck.updateHandValue('chris', 5)).not.toThrow();
  });

  it('empties every hand but keeps the seats', () => {
    const deck = new PlayingCardDeck();
    deck.deal(2, ['chris', 'dealer']);
    deck.clearHands();
    expect(Object.keys(deck.playerHands)).toEqual(['chris', 'dealer']);
    expect(deck.playerHands.chris.cards).toEqual([]);
    expect(deck.playerHands.dealer.handValue.highest).toBe(0);
  });

  it('selects and unselects cards once each', () => {
    const deck = new PlayingCardDeck();
    deck.playerHands.chris = { cards: ['Spade_8', 'Heart_10'], handValue: { aceAsEleven: 18, aceAsOne: 18, highest: 18 } };
    expect(deck.getSelected('chris')).toEqual([]);
    deck.select('Spade_8');
    deck.select('Spade_8');
    deck.select('Club_2');
    expect(deck.selectedKeys).toEqual(['Spade_8', 'Club_2']);
    expect(deck.getSelected('chris')).toEqual(['Spade_8']);
    deck.unselect('Club_2');
    deck.unselect('Club_2');
    expect(deck.selectedKeys).toEqual(['Spade_8']);
    deck.clearSelected();
    expect(deck.selectedKeys).toEqual([]);
  });

  it('removes named cards from a hand', () => {
    const deck = new PlayingCardDeck();
    deck.playerHands.chris = { cards: ['Spade_8', 'Heart_10', 'Club_2'], handValue: { aceAsEleven: 20, aceAsOne: 20, highest: 20 } };
    deck.removeSelectedFromPlayerHand('chris', ['Heart_10', 'Diamond_5']);
    expect(deck.playerHands.chris.cards).toEqual(['Spade_8', 'Club_2']);
  });

  it('puts cards back on the top, the bottom or in the middle', () => {
    const deck = new PlayingCardDeck();
    deck.cards = cardsOf('Club_2', 'Club_3');
    deck.putOnTopOfDeck(cardsOf('Heart_9'));
    deck.putOnBottomOfDeck(cardsOf('Heart_8'));
    expect(deck.cardKeys).toEqual(['Heart_8', 'Club_2', 'Club_3', 'Heart_9']);
    deck.putInMiddleOfDeck(cardsOf('Heart_7'));
    expect(deck.length).toBeGreaterThanOrEqual(4);
    expect(deck.has('Heart_7')).toBe(true);
  });

  it('resets to a full shoe of the size asked for, with no hands', () => {
    const deck = new PlayingCardDeck();
    deck.deal(2, ['chris']);
    deck.select('Spade_8');
    deck.reset(2);
    expect(deck.numberOfDecks).toBe(2);
    expect(deck.length).toBe(104);
    expect(deck.state).toMatchObject({ drawnKeys: [], selectedKeys: [], playerHands: {} });

    // shuffling an empty deck makes a new one first
    deck.cards = [];
    deck.shuffle();
    expect(deck.length).toBe(104);
  });
});

describe('PlayingCard', () => {
  it('reads its suit, rank and point values from its key', () => {
    const queen = new PlayingCard('Heart_12');
    expect(queen.toString()).toBe('Queen of Hearts');
    expect(queen.sort).toEqual({ name: 'Q', value: 12 });
    expect(new PlayingCard('Club_7').sort.name).toBe('7');
    // a copy suffix on a later deck's key does not change the card
    expect(new PlayingCard('Spade_14_3').toString()).toBe('Ace of Spades');

    expect(PlayingCard.pointValue('Spade_14')).toEqual([1, 11]);
    expect(PlayingCard.pointValue('Spade_13')).toEqual([10, 10]);
    expect(PlayingCard.pointValue('Spade_10')).toEqual([10, 10]);
    expect(PlayingCard.pointValue('Spade_9_2')).toEqual([9, 9]);
  });
});
