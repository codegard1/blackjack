/*  adapted from node-shuffle 
    https://github.com/codegard1/node-shuffle.git */

import { PlayingCard } from ".";
import { CardTuple } from "../enums";
import { getRandomIndex } from "../functions";
import { IPlayingCardDeck, IPlayingCardDeckState } from "../interfaces";
import { PlayerHandList, PlayerKey, PlayingCardKey } from "../types";

/**
 * A set of 52 Playing Cards in random order
 */
export class PlayingCardDeck implements IPlayingCardDeckState, IPlayingCardDeck {
  public selected: PlayingCard[] = [];
  public drawn: PlayingCard[] = [];
  public cards: PlayingCard[] = [];
  public playerHands: PlayerHandList = {};

  /**
   * Static method to generate 52 unique card keys
   * @returns 
   */
  static cardKeys(): PlayingCardKey[] {
    // Initialize an array to hold our output value
    let _: PlayingCardKey[] = [];

    // For each suit defined in the PlayingCard class
    for (let key in PlayingCard.cardSuits) {

      // Get the suit name
      const suitName = PlayingCard.cardSuits[key];

      // Generate 13 cards starting at 2
      for (let index = 2; index <= 14; index++) {

        // Compose the Card key from the Suit name, the Card name, and the Card sort 
        // Add the card key to our output array
        _.push([suitName.single, index].join('_'));

      }
    }

    // Return a copy of the array
    return _.slice();
  }

  constructor(options?: IPlayingCardDeckState) {
    if (undefined !== options) {
      this.selected = options.selectedKeys.map(this.newCard);
      this.drawn = options.drawnKeys.map(this.newCard);
      this.cards = options.cardKeys.map(this.newCard);
      this.playerHands = options.playerHands;
    } else {
      this.reset();
    }
  }

  private random(): number {
    return Math.random();
  }

  public get randomIndex(): number {
    return getRandomIndex(this.cards);
  }

  /**
   * Return the number of deck cards remaining
   */
  public get length(): number {
    return this.cards ? this.cards.length : 0;
  }

  /**
   * Return deck cards as keys
   */
  public get cardKeys(): PlayingCardKey[] {
    return this.cards.map((c) => c.key);
  }

  /**
   * Return selected cards as keys
   */
  public get selectedKeys(): PlayingCardKey[] {
    return this.selected.map((c) => c.key);
  }

  /**
   * Return drawn cards as keys
   */
  public get drawnKeys(): PlayingCardKey[] {
    return this.drawn.map((c) => c.key);
  }

  /**
   * Return a specific player's hand
   * @param key PlayerKey
   * @returns Array of PlayingCard
   */
  public getHand(key: PlayerKey) {
    return this.playerHands[key].cards;
  }

  public getHandValue(key: PlayerKey) {
    return this.playerHands[key].handValue
  }

  /**
   * Generate a set of 52 distinct cards for the deck
   */
  private makeCards(): void {
    this.cards = PlayingCardDeck.cardKeys().map(this.newCard);
  }

  /**
   * Shuffle the cards using the Fisher-Yates method
   */
  public shuffle(): void {
    if (this.length === 0) this.makeCards();
    this.cards = this.fisherYates(this.cards);
  }

  public newCard(key: PlayingCardKey): PlayingCard {
    return new PlayingCard(key);
  }

  public reset(): void {
    this.makeCards();
    // this.shuffle();
    this.drawn = [];
    this.selected = [];
    this.playerHands = {};
  }

  /**
   * Distribute a certain number of cards to every playerHand
   * @param numberOfCards 
   */
  public deal(numberOfCards: number): void {
    for (let key in this.playerHands) {
      this.playerHands[key].cards.push(...this.draw(2));
    }
  }

  /**
   * array shuffling algorithm: http://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
   * @param cards 
   */
  public fisherYates(cards: PlayingCard[]): PlayingCard[] {
    if (cards.length === 0) return [];
    let i = cards.length;
    while (--i) {
      const j = Math.floor(this.random() * (i + 1));
      const tempi = cards[i];
      const tempj = cards[j];
      cards[i] = tempj;
      cards[j] = tempi;
    }
    return cards;
  }

  public putOnBottomOfDeck(cards: PlayingCard[]) {
    cards.forEach((c, i,) => {
      this.cards.unshift(c);
      if (c.key in this.drawnKeys) this.drawn.splice(i, 1);
    });
  }

  public putOnTopOfDeck(cards: PlayingCard[]) {
    cards.forEach((c, i,) => {
      this.cards.push(c);
      if (c.key in this.drawnKeys) this.drawn.splice(i, 1);
    });
  }

  public putInMiddleOfDeck(cards: PlayingCard[]) {
    cards.forEach((c, i) => {
      const _ix = this.randomIndex;
      this.cards = [...this.cards.slice(0, _ix - 1), c, ...this.cards.slice(_ix)];
      if (c.key in this.drawnKeys) this.drawn.splice(i, 1);
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

  /**
   * Add a card to the selected array
   * @param key unique key of the card to add
   */
  public select(key: PlayingCardKey) {
    if (!(this.selectedKeys.indexOf(key) === -1)) this.selected.push(new PlayingCard(key));
  }

  /**
   * Remove a card from the selected array
   * @param key Unique key of the card to remove
   */
  public unselect(key: PlayingCardKey) {
    const ix = this.selected.findIndex((v) => v.key === key);
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

  /**
   * Return true if the specific cardKey is in the cards array 
   * @param cardKey 
   * @returns 
   */
  public has(cardKey: PlayingCardKey): boolean {
    return this.cardKeys.indexOf(cardKey) !== -1;
  }

  /**
   * Reset all player hands to the default state
   */
  public clearHands() {
    for (let key in this.playerHands) { this.newPlayerHand(key) }
  }

  public hit(key: PlayerKey): PlayingCard {
    const card = this.draw(1);
    this.playerHands[key].cards.push(...card);
    return card[0];
  }

  public removeSelectedFromPlayerHand(key: PlayerKey, cards: PlayingCard[]) {
    const hand = this.playerHands[key].cards;
    cards.forEach(card => {
      let index = hand.findIndex(element => {
        return element.suit === card.suit && element.sort === card.sort;
      });
      hand.splice(index, 1);
      this.playerHands[key].cards = hand;
    });
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
*/