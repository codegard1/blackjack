import { Suit } from "./Suit";

export type SuitCollection = {
  'Heart': any;
  'Spade': any;
  'Diamond': any;
  'Club': any;
}

export type SuitCollectionKey = SuitCollection[Suit];
