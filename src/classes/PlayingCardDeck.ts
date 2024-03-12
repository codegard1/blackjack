/*  adapted from node-shuffle 
    https://github.com/codegard1/node-shuffle.git */

import { IPlayingCardDeck } from "../interfaces";
import { Suit, CardTuple, PlayingCardKey, PlayerHand, PlayerKey } from "../types";
import { PlayingCard } from "./PlayingCard";
import { PlayingCardSuit } from "./PlayingCardSuit";


export type PlayerHandList = {
  [index: PlayerKey]: PlayerHand;
}

/**
 * A set of 52 Playing Cards in random order
 */
export class PlayingCardDeck implements IPlayingCardDeck {
  public cards: PlayingCard[] = [];
  public drawn: PlayingCard[] = [];
  public selected: PlayingCardKey[] = [];
  public playerHands: PlayerHandList = {};

  constructor() {
    this.reset();
    this.shuffle();
  }

  private random(): number {
    return Math.random();
  }

  public get length(): number {
    return this.cards.length;
  }

  public shuffle(): void {
    this.fisherYates(this.cards);
  }

  public reset(): void {
    const cardTuples: CardTuple[] = [
      { name: "Two", value: 2 },
      { name: "Three", value: 3 },
      { name: "Four", value: 4 },
      { name: "Five", value: 5 },
      { name: "Six", value: 6 },
      { name: "Seven", value: 7 },
      { name: "Eight", value: 8 },
      { name: "Nine", value: 9 },
      { name: "Ten", value: 10 },
      { name: "Jack", value: 11 },
      { name: "Queen", value: 12 },
      { name: "King", value: 13 },
      { name: "Ace", value: 14 },
    ];

    const cardSuits = PlayingCardSuit.suits();

    let _cards: PlayingCard[] = [];
    cardSuits.forEach((suit: Suit) =>
      cardTuples.forEach((t) =>
        _cards.push(
          new PlayingCard(
            new PlayingCardSuit(suit),
            t.name,
            t.value
          )
        )
      )
    );
    this.cards = _cards.slice(0);
    this.drawn = [];
    this.selected = [];
  }

  public deal(numberOfCards: number, arrayOfHands: any[]): any[] {
    for (let i = 0; i < numberOfCards; i++)
      for (let j = 0; j < arrayOfHands.length; j++) {
        const _pop = this.cards.pop();
        if (_pop !== undefined) {
          this.drawn.push(_pop);
          arrayOfHands[j].push(_pop);
        }
      }
    return arrayOfHands;
  }

  /**
   * array shuffling algorithm: http://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
   * @param cards 
   */
  private fisherYates(cards: PlayingCard[]): void {
    if (this.length === 0) return;
    let i = this.length;
    while (--i) {
      const j = Math.floor(this.random() * (i + 1));
      const tempi = cards[i];
      const tempj = cards[j];
      cards[i] = tempj;
      cards[j] = tempi;
    }
  }

  public putOnBottomOfDeck(cards: PlayingCard[]) {
    this.cards.unshift(...cards);
    cards.forEach((c, i,) => {
      const keys = this.drawn.map((c) => c.key);
      if (c.key in keys) this.drawn.splice(i, 1);
    });
  }

  public putOnTopOfDeck(cards: PlayingCard[]) {
    this.cards.push(...cards);
    cards.forEach((c, i,) => {
      const keys = this.drawn.map((c) => c.key);
      if (c.key in keys) this.drawn.splice(i, 1);
    });
  }

  public draw(num: number): PlayingCard[] {
    if (this.length === 0) return [];

    if (!num || num < 1) num = 1;
    let _cards = [];
    for (let i = 0; i < num; i++) {
      const _popped = this.cards.pop();
      if (_popped !== undefined) {
        _cards.push(_popped);
        this.drawn.push(_popped);
      }
    }
    return _cards;
  }

  public drawRandom(num: number): PlayingCard[] {
    const _draw = () => {
      const index = Math.floor(this.random() * this.length);
      const card = this.cards[index];
      this.cards.splice(index, 1);
      return card;
    };

    if (!num || num < 1) num = 1;
    let _cards = [];
    for (let i = 0; i < num; i++) {
      const _drawn = _draw();
      if (_drawn !== undefined) {
        _cards.push(_drawn);
        this.drawn.push(_drawn);
      }
    }
    return _cards;
  }

  public drawFromBottomOfDeck(num: number): PlayingCard[] {
    if (!num || num < 1) num = 1;

    let _cards = [];
    for (let i = 0; i < num; i++) {
      const _shifted = this.cards.shift();
      if (_shifted !== undefined) {
        _cards.push(_shifted);
        this.drawn.push(_shifted);
      };
    }

    return _cards;
  }

  public get drawnCardKeys(): PlayingCardKey[] {
    return this.drawn.map((c) => c.key);
  }

  public get deckCardKeys(): PlayingCardKey[] {
    return this.cards.map((c) => c.key);
  }

  /**
   * Add a card to the selected array
   * @param key unique key of the card to add
   */
  public select(key: PlayingCardKey) {
    if (!(key in this.selected)) this.selected.push(key);
  }

  /**
   * Remove a card from the selected array
   * @param key Unique key of the card to remove
   */
  public unselect(key: PlayingCardKey) {
    const ix = this.selected.findIndex((v) => v === key);
    if (ix > -1) this.selected.splice(ix, 1);
  }

  public newPlayerHand(key: PlayerKey) {
    this.playerHands[key] = {
      cards: [],
      handValue: {
        aceAsEleven: 0,
        aceAsOne: 0,
        highest: 0,
      }
    }
  }

  public clearSelected() {
    this.selected = [];
  }
}


/*
  getSelected(playerKey) {
    const { selected } = this.state;

    if (selected.length > 0) {
      let foundMatch = false;
      let foundCards = [];
      const playerHand = this.getHand(playerKey);

      // check each card in selected to see if it's in the specified player's hand 
      selected.forEach(selectedCard => {
        playerHand.forEach(playerCard => {
          // console.log(`comparing ${selectedCard} to ${playerCard}`);
          if (
            playerCard.suit === selectedCard.suit &&
            playerCard.sort === selectedCard.sort
          ) {
            // console.log(`Found Match: ${selectedCard}`);
            foundMatch = true;
            foundCards.push(selectedCard);
          }
        });
      });

      if (foundMatch && foundCards.length > 0) {
        return foundCards;
      } else {
        return false;
      }
    } else {
      return false;
    }
  },

getHand(key) {
  return this.state.playerHands[key].hand;
}

getHandValue(key) {
  return (this.state.playerHands[key]) ?
    this.evaluateHand(key) :
    this.defaultPlayerHandState.getHandValue;
}

select(cardAttributes) {
  this.state.selected.push(
    new PlayingCard(
      cardAttributes.suit,
      cardAttributes.description,
      cardAttributes.sort
    )
  );
},


deselect(cardAttributes) {
  const toDeselect = this.state.selected.findIndex(
    card =>
      card.suit === cardAttributes.suit && card.sort === cardAttributes.sort
  );
  this.state.selected.splice(toDeselect, 1);
},


clearHands() {
  for (const key in this.state.playerHands) { this.newPlayerHand(key) }
},

removeSelectedFromPlayerHand(key, cards) {
  const { hand } = this.state.playerHands[key].hand;
  cards.forEach(card => {
    let index = hand.findIndex(element => {
      return element.suit === card.suit && element.sort === card.sort;
    });
    hand.splice(index, 1);
    this.state.playerHands[key] = hand;
  });
},


deal() {
  for (const key in this.state.playerHands) {
    this.state.playerHands[key].hand = this.draw(2);
    this.evaluateHand(key);
  }
},


hit(key) {
  const card = this.draw(1);
  this.state.playerHands[key].hand.push(card);
  return card;
},


*/