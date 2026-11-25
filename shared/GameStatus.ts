export enum GameStatus {
  'Init',
  'InProgress',
  'NextTurn',
  /** every seat's hand has a result; settlement follows */
  'RoundOver',
  'GameOver'
}
