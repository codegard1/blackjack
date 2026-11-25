import { DeckState, PlayerHand, PlayerHandList, PlayerHandValue, PlayerKey, PlayingCardKey } from '../../shared';
import { buildCardKeys } from './cards';
import { handValue } from './getHandValue';

function cloneHand(hand: PlayerHand): PlayerHand {
  return {
    ...hand,
    cards: hand.cards.slice(),
    handValue: { ...hand.handValue },
    ...(hand.splitHands ? { splitHands: hand.splitHands.map(cloneHand) } : {}),
  };
}

/** An empty player hand with zeroed totals */
export function emptyHand(): PlayerHand {
  return {
    cards: [],
    handValue: {
      aceAsEleven: 0,
      aceAsOne: 0,
      highest: 0,
    },
  };
}

/** Fisher-Yates shuffle returning a new array of keys */
export function shuffleKeys(
  keys: readonly PlayingCardKey[],
  rng: () => number = () => Math.random(),
): PlayingCardKey[] {
  if (keys.length === 0) return [];
  const result = keys.slice();
  let i = result.length;
  while (--i) {
    const j = Math.floor(rng() * (i + 1));
    const tempi = result[i];
    const tempj = result[j];
    result[i] = tempj;
    result[j] = tempi;
  }
  return result;
}

/** Build a freshly shuffled shoe of `numberOfDecks` decks */
export function createDeck(
  numberOfDecks = 1,
  rng: () => number = () => Math.random(),
): DeckState {
  return {
    cardKeys: shuffleKeys(buildCardKeys(numberOfDecks), rng),
    drawnKeys: [],
    selectedKeys: [],
    playerHands: {},
  };
}

/** Make a defensive plain copy of a saved DeckState */
export function restoreDeckState(saved: DeckState): DeckState {
  const playerHands: PlayerHandList = Object.fromEntries(
    Object.entries(saved.playerHands).map(([key, hand]) => [key, cloneHand(hand)]),
  );
  return {
    selectedKeys: saved.selectedKeys.slice(),
    drawnKeys: saved.drawnKeys.slice(),
    cardKeys: saved.cardKeys.slice(),
    playerHands,
  };
}

/** All hands for a seat, with split hands following the primary hand */
export function getPlayerHands(deck: DeckState, key: PlayerKey): PlayerHand[] {
  const hand = deck.playerHands[key];
  return hand ? [hand, ...(hand.splitHands ?? [])] : [];
}

/** Look up one hand (primary by default, or split hand by index) */
export function getPlayerHand(deck: DeckState, key: PlayerKey, handIndex = 0): PlayerHand | undefined {
  return getPlayerHands(deck, key)[handIndex];
}

/** Compute blackjack totals for a seat's hand */
export function getPlayerHandValue(deck: DeckState, key: PlayerKey, handIndex = 0): PlayerHandValue {
  return handValue(getPlayerHand(deck, key, handIndex)?.cards ?? []);
}

/** Shuffle remaining cards in the deck, rebuilding a full shoe if empty */
export function shuffleDeck(
  deck: DeckState,
  numberOfDecks = 1,
  rng: () => number = () => Math.random(),
): DeckState {
  const source = deck.cardKeys.length === 0 ? buildCardKeys(numberOfDecks) : deck.cardKeys;
  return {
    ...deck,
    cardKeys: shuffleKeys(source, rng),
  };
}

/** Rebuild and shuffle the remaining shoe from every card not currently in a hand */
export function refillDeckCards(
  deck: DeckState,
  numberOfDecks = 1,
  rng: () => number = () => Math.random(),
): DeckState {
  const inHands = new Set<PlayingCardKey>();
  for (const key of Object.keys(deck.playerHands)) {
    for (const hand of getPlayerHands(deck, key)) {
      for (const card of hand.cards) inHands.add(card);
    }
  }
  const remaining = buildCardKeys(numberOfDecks).filter((key) => !inHands.has(key));
  return {
    ...deck,
    cardKeys: shuffleKeys(remaining, rng),
  };
}

/** Ensure a seat has an entry in `playerHands` */
export function ensurePlayerHand(deck: DeckState, key: PlayerKey): DeckState {
  if (key in deck.playerHands) return deck;
  return {
    ...deck,
    playerHands: {
      ...deck.playerHands,
      [key]: emptyHand(),
    },
  };
}

/** Reset every seat's hand to empty while keeping the seat keys */
export function clearAllHands(deck: DeckState): DeckState {
  const playerHands: PlayerHandList = Object.fromEntries(
    Object.keys(deck.playerHands).map((key) => [key, emptyHand()]),
  );
  return {
    ...deck,
    playerHands,
  };
}

/** Align `playerHands` to `keys`, keeping existing hands and dropping removed seats */
export function syncDeckHands(deck: DeckState, keys: readonly PlayerKey[]): DeckState {
  const playerHands: PlayerHandList = {};
  for (const key of keys) {
    playerHands[key] = deck.playerHands[key] ?? emptyHand();
  }
  return {
    ...deck,
    playerHands,
  };
}

/** Transform one primary or split hand without mutating the deck or untouched hands */
export function updateHand(
  deck: DeckState,
  key: PlayerKey,
  handIndex: number,
  updater: (hand: PlayerHand) => PlayerHand,
): DeckState {
  const existing = deck.playerHands[key];
  if (!existing || handIndex < 0) return deck;

  if (handIndex === 0) {
    const updated = updater(existing);
    if (updated === existing) return deck;
    return {
      ...deck,
      playerHands: {
        ...deck.playerHands,
        [key]: updated,
      },
    };
  }

  const splitHands = existing.splitHands;
  const splitIndex = handIndex - 1;
  if (!splitHands || splitIndex >= splitHands.length) return deck;
  const target = splitHands[splitIndex];
  const updated = updater(target);
  if (updated === target) return deck;
  const nextSplits = splitHands.slice();
  nextSplits[splitIndex] = updated;
  return {
    ...deck,
    playerHands: {
      ...deck.playerHands,
      [key]: {
        ...existing,
        splitHands: nextSplits,
      },
    },
  };
}

/** Recompute `handValue` from the cards in a seat's hand */
export function updateHandValue(deck: DeckState, key: PlayerKey, handIndex = 0): DeckState {
  return updateHand(deck, key, handIndex, (hand) => ({
    ...hand,
    handValue: handValue(hand.cards),
  }));
}

/** Append drawn cards to a seat's hand (creating it if missing) and refresh `handValue` */
export function appendCardsToHand(
  deck: DeckState,
  key: PlayerKey,
  cards: readonly PlayingCardKey[],
  handIndex = 0,
): DeckState {
  const ensured = ensurePlayerHand(deck, key);
  return updateHand(ensured, key, handIndex, (hand) => {
    const nextCards = [...hand.cards, ...cards];
    return {
      ...hand,
      cards: nextCards,
      handValue: handValue(nextCards),
    };
  });
}

/** Draw `count` cards from the top, bottom, or at random, recording them in `drawnKeys` */
export function drawCards(
  deck: DeckState,
  count = 1,
  side: 'top' | 'bottom' | 'random' = 'top',
  rng: () => number = () => Math.random(),
): { deck: DeckState; drawn: PlayingCardKey[] } {
  if (deck.cardKeys.length === 0) return { deck, drawn: [] };

  const num = !count || count < 1 ? 1 : count;
  const take = Math.min(num, deck.cardKeys.length);

  let remaining: PlayingCardKey[];
  let drawn: PlayingCardKey[];
  if (side === 'top') {
    const splitAt = deck.cardKeys.length - take;
    drawn = deck.cardKeys.slice(splitAt).reverse();
    remaining = deck.cardKeys.slice(0, splitAt);
  } else if (side === 'bottom') {
    drawn = deck.cardKeys.slice(0, take);
    remaining = deck.cardKeys.slice(take);
  } else {
    remaining = deck.cardKeys.slice();
    drawn = [];
    for (let i = 0; i < take; i++) {
      const index = Math.floor(rng() * remaining.length);
      drawn.push(remaining.splice(index, 1)[0]);
    }
  }

  return {
    deck: {
      ...deck,
      cardKeys: remaining,
      drawnKeys: [...deck.drawnKeys, ...drawn],
    },
    drawn,
  };
}

/** Deal `count` cards from the top to each named seat, creating missing hands */
export function dealCards(
  deck: DeckState,
  count = 2,
  keys: readonly PlayerKey[] = Object.keys(deck.playerHands),
): DeckState {
  let next = deck;
  for (const key of keys) {
    const { deck: afterDraw, drawn } = drawCards(next, count, 'top');
    next = appendCardsToHand(afterDraw, key, drawn, 0);
  }
  return next;
}

/** Split a pair into two hands for `stake`, flagging split aces */
export function splitPlayerHand(
  deck: DeckState,
  key: PlayerKey,
  handIndex: number,
  stake: number,
): { deck: DeckState; isSplitAces: boolean } {
  const root = deck.playerHands[key];
  const hand = getPlayerHand(deck, key, handIndex);
  if (!root || !hand || hand.cards.length < 2) return { deck, isSplitAces: false };

  const [firstCard, movedCard, ...rest] = hand.cards;
  const isSplitAces = Number(movedCard.split('_')[1]) === 14;
  const splitHand: PlayerHand = {
    cards: [movedCard],
    handValue: handValue([movedCard]),
    stake,
    isSplit: true,
    ...(isSplitAces ? { isSplitAces: true } : {}),
  };
  const mainCards = [firstCard, ...rest];
  const updatedHand: PlayerHand = {
    ...hand,
    cards: mainCards,
    handValue: handValue(mainCards),
    stake,
    isSplit: true,
    ...(isSplitAces ? { isSplitAces: true } : {}),
  };

  let nextRoot: PlayerHand;
  if (handIndex === 0) {
    nextRoot = {
      ...updatedHand,
      splitHands: [splitHand, ...(root.splitHands ?? [])],
    };
  } else {
    const nextSplits = [...(root.splitHands ?? [])];
    const splitIndex = handIndex - 1;
    nextSplits[splitIndex] = updatedHand;
    nextSplits.splice(splitIndex + 1, 0, splitHand);
    nextRoot = {
      ...root,
      splitHands: nextSplits,
    };
  }

  return {
    deck: {
      ...deck,
      playerHands: {
        ...deck.playerHands,
        [key]: nextRoot,
      },
    },
    isSplitAces,
  };
}

/** Add a card key to `selectedKeys` if not already selected */
export function selectCard(deck: DeckState, key: PlayingCardKey): DeckState {
  if (deck.selectedKeys.includes(key)) return deck;
  return {
    ...deck,
    selectedKeys: [...deck.selectedKeys, key],
  };
}

/** Remove a card key from `selectedKeys` if present */
export function unselectCard(deck: DeckState, key: PlayingCardKey): DeckState {
  if (!deck.selectedKeys.includes(key)) return deck;
  return {
    ...deck,
    selectedKeys: deck.selectedKeys.filter((item) => item !== key),
  };
}
