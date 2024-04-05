/*  adapted from node-shuffle 
    https://github.com/codegard1/node-shuffle.git */

import { PlayingCard } from ".";
import { _cardKeys, getRandomIndex } from "../functions";
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

  constructor(options?: IPlayingCardDeckState) {
    if (undefined !== options) {
      this.selected = options.selectedKeys.map((ck) => new PlayingCard(ck));
      this.drawn = options.drawnKeys.map((ck) => new PlayingCard(ck));
      this.cards = options.cardKeys.map((ck) => new PlayingCard(ck));
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

  public get length(): number {
    return this.cards.length;
  }

  public get cardKeys(): PlayingCardKey[] {
    return this.cards.map((c) => c.key);
  }

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
   * Shuffle the cards using the Fisher-Yates method
   */
  public shuffle(): void {
    console.log('PlayingCardDeck#shuffle');
    this.cards = this.fisherYates(this.cards);
  }

  public reset(): void {
    this.cards = _cardKeys().map((ck) => new PlayingCard(ck));
    this.shuffle();
    this.drawn = [];
    this.selected = [];
    this.playerHands = {};
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