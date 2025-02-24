import { SuitName } from "./SuitName";

export type SuitCollection = {
  'Heart': string;
  'Spade': string;
  'Diamond': string;
  'Club': string;
}

export type SuitCollectionKey = SuitCollection[SuitName];
