
export type PlayerStats = {
  [index: string]: number;
  numberOfGamesLost: number;
  numberOfGamesPlayed: number;
  numberOfGamesWon: number;
  numberOfTimesBlackjack: number;
  numberOfTimesBusted: number;
  totalWinnings: number;
  winLossRatio: number;
}

export type PlayerStatsKey = [index: string];
