/** Who sits in a seat: the person playing, a computer character, or the dealer */
export type PlayerRole = 'human' | 'bot' | 'dealer';

/** How a seat's hand ended against the dealer */
export type RoundResult = 'blackjack' | 'win' | 'push' | 'loss';
