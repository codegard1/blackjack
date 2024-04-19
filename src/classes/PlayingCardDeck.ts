/*  adapted from node-shuffle 
    https://github.com/codegard1/node-shuffle.git */

import { PlayingCard } from ".";
import { getRandomIndex, handValue } from "../functions";
import { IPlayingCardDeck } from "../interfaces";
import { DeckState, PlayerHand, PlayerHandList, PlayerKey, PlayingCardKey } from "../types";

/**
 * A set of 52 Playing Cards in random order
 */
export class PlayingCardDeck implements IPlayingCardDeck {
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
      for (let index = 2; index < 15; index++) {

        // Compose the Card key from the Suit name, the Card name, and the Card sort 
        // Add the card key to our output array
        _.push([suitName.single, index].join('_'));

      }
    }

    // Return a copy of the array
    return _.slice();
  }

  constructor(options?: DeckState) {
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

  public get state(): DeckState {
    return {
      selectedKeys: this.selectedKeys,
      drawnKeys: this.drawnKeys,
      cardKeys: this.cardKeys,
      playerHands: this.playerHands,
    }
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
  public getHand(key: PlayerKey): PlayerHand {
    return {
      cards: this.playerHands[key].cards,
      handValue: this.getHandValue(key),
    };
  }

  public getHandValue(key: PlayerKey) {
    return handValue(this.playerHands[key].cards);
  }

  /**
   * Generate a set of cards for the deck
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

  public card(key: PlayingCardKey): PlayingCard {
    return this.newCard(key);
  }

  public reset(): void {
    this.makeCards();
    this.shuffle();
    this.drawn = [];
    this.selected = [];
    this.playerHands = {};
  }

  /**
   * Distribute a certain number of cards to every playerHand
   * @param numberOfCards 
   */
  public deal(numberOfCards: number = 2): void {
    for (let key in this.playerHands) {
      this.playerHands[key].cards.push(...this.draw(numberOfCards));
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

  public draw(num: number): PlayingCardKey[] {
    if (this.length === 0) return [];

    if (!num || num < 1) num = 1;
    let cardKeys = [];
    for (let i = 0; i < num; i++) {
      const _popped = this.cards.pop()
      if (_popped !== undefined) {
        cardKeys.push(_popped.key);
        this.drawn.push(_popped);
      }
    }
    return cardKeys;
  }

  public drawRandom(num: number = 1): PlayingCardKey[] {
    const _draw = () => {
      const index = Math.floor(this.random() * this.length);
      const card = this.cards[index];
      this.cards.splice(index, num);
      return card;
    };

    let cardKeys = [];
    for (let i = 0; i < num; i++) {
      const _drawn = _draw();
      if (_drawn !== undefined) {
        cardKeys.push(_drawn.key);
        this.drawn.push(_drawn);
      }
    }
    return cardKeys;
  }

  /**
   * Draw one or more cards from the deck
   * @param numberOfCards 
   * @returns 
   */
  public drawFromBottomOfDeck(numberOfCards: number = 1): PlayingCardKey[] {
    let cardKeys = [];
    for (let i = 0; i < numberOfCards; i++) {
      const _shifted = this.cards.shift();
      if (_shifted !== undefined) {
        cardKeys.push(_shifted.key);
        this.drawn.push(_shifted);
      };
    }
    return cardKeys;
  }

  /**
   * Add a card to the selected array
   * @param key unique key of the card to add
   */
  public select(key: PlayingCardKey) {
    if (this.selectedKeys.indexOf(key) === -1) this.selected.push(new PlayingCard(key));
  }

  /**
   * Remove a card from the selected array
   * @param key Unique key of the card to remove
   */
  public unselect(key: PlayingCardKey) {
    const ix = this.selected.findIndex((v) => v.key === key);
    if (ix !== -1) this.selected.splice(ix, 1);
  }

  /**
   * Create a new, empty playerHand object for the specified player
   * @param key PlayerKey
   */
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

  /**
   * Remove all cards from the selected array
   */
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

  /**
   * Draw a single card for the specified player
   * @param key PlayerKey
   * @returns 
   */
  public hit(key: PlayerKey): PlayingCardKey {
    const cardKey = this.draw(1);
    this.playerHands[key].cards.push(cardKey[0]);
    return cardKey[0];
  }

  public removeSelectedFromPlayerHand(key: PlayerKey, cardKeys: PlayingCardKey[]) {
    const hand = this.playerHands[key].cards.slice();
    cardKeys.forEach(cardKey => {
      let index = hand.indexOf(cardKey);
      if (index !== -1) hand.splice(index, 1);
      this.playerHands[key].cards = hand;
    });
  }

  /**
   * Return array of cards in the given player's hand that are also in the selected array
   * @param playerKey 
   * @returns 
   */
  public getSelected(key: PlayerKey): PlayingCardKey[] {

    if (this.state.selectedKeys.length === 0) return [];

    let foundMatch = false;
    let foundCards: PlayingCardKey[] = [];
    const playerHand = this.getHand(key);

    // check each card in selected to see if it's in the specified player's hand 
    this.state.selectedKeys.forEach(selectedCard => {
      playerHand.cards.forEach(playerCard => {
        console.log(`comparing ${selectedCard} to ${playerCard}`);
        if (playerCard === selectedCard) {
          console.log(`Found Match: ${selectedCard}`);
          foundMatch = true;
          foundCards.push(selectedCard);
        }
      });
    });

    return (foundMatch && foundCards.length > 0) ? foundCards : [];
  }
}
