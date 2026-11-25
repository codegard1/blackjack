
export type PlayerStats = {
  [index: string]: number;
  numberOfGamesLost: number;
  numberOfGamesPlayed: number;
  numberOfGamesWon: number;
  numberOfTimesBlackjack: number;
  numberOfTimesBusted: number;
  /** total won on winning hands; no longer shown, kept so saved stats stay whole */
  totalWinnings: number;
  /** bank change across every settled hand, stakes included; negative when down */
  netResult: number;
  winLossRatio: number;
}

export type PlayerStatsKey = [index: string];
