export type Player = {
  bank: 1000;
  disabled?: boolean;
  id: number;
  isNPC: boolean;
  key: string;
  selected: boolean;
  title: string;
}

export type PlayerKey = Player['key'];
