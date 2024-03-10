import { PlayingCard } from "../classes";

export type Player = {
  bank: 1000;
  disabled?: boolean;
  id: number;
  isNPC: boolean;
  key: string;
  selected: boolean;
  title: string;
  hand: PlayingCard[];
}

export type PlayerKey = Player['key'];
