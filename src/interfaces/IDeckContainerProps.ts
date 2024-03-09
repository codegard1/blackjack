export interface IDeckContainerProps {
  handValue: any; // DeckStore
  hidden: boolean; // props
  isNPC: boolean; // props
  isPlayerDeck: boolean;
  isSelectable: boolean; // props
  title: string; // props
  turnCount: number; // GameStore
  player: any; // GameStore
}
