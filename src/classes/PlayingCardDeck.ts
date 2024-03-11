/*  adapted from node-shuffle 
    https://github.com/codegard1/node-shuffle.git */

import { IPlayingCardDeck } from "../interfaces";
import { Suit, CardTuple } from "../types";
import { PlayingCard } from "./PlayingCard";
import { PlayingCardSuit } from "./PlayingCardSuit";

/**
 * A set of 52 Playing Cards in random order
 */
export class PlayingCardDeck implements IPlayingCardDeck {
  public cards: PlayingCard[] = [];

  constructor() {
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
    this.cards = _cards;
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
    this.cards = this.cards.slice(0);
  }

  public deal(numberOfCards: number, arrayOfHands: any[]): any[] {
    for (let i = 0; i < numberOfCards; i++)
      for (let j = 0; j < arrayOfHands.length; j++) {
        const _pop = this.cards.pop();
        if (_pop !== undefined) arrayOfHands[j].push(_pop);
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
  }

  public putOnTopOfDeck(cards: PlayingCard[]) {
    this.cards.push(...cards);
  }

  public draw(num: number): PlayingCard[] {
    if (this.length === 0) return [];

    if (!num || num < 1) num = 1;
    let _cards = [];
    for (let i = 0; i < num; i++) {
      const _popped = this.cards.pop();
      if (_popped !== undefined) _cards.push(_popped);
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
      if (_drawn !== undefined) _cards.push(_drawn);
    }
    return _cards;
  }

  public drawFromBottomOfDeck(num: number): PlayingCard[] {
    if (!num || num < 1) num = 1;

    let _cards = [];
    for (let i = 0; i < num; i++) {
      const _shifted = this.cards.shift();
      if (_shifted !== undefined) _cards.push(_shifted);
    }
    return _cards;
  }

}
