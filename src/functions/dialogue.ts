import { getCharacter } from '../characters';
import { GameState, PlayerKey } from '../types';
import { getPlayerHand } from './deck';
import { getPlayer } from './playerStore';
import { roundStake } from './round';

export type DialoguePool = {
  idle: string[];
  risky: string[];
  hit: string[];
  aggressive: string[];
  stay: string[];
  bust: string[];
  win: string[];
  blackjack: string[];
  loss: string[];
  push: string[];
};

/**
 * Modular, character-voiced dialogue pools for every AI seat and the dealer.
 * Sequential arrays advance across successive plays within a hand or across rounds.
 */
export const DIALOGUE_POOLS: Record<string, DialoguePool> = {
  ogion: {
    idle: ['Thirteen is plenty.', 'The tide will turn when it is ready.', 'Listen before you reach.'],
    risky: ['Sixteen is a thin plank in a squall.', 'Stiff hand. Steady breath.', 'A hard total asks for patience, not haste.'],
    hit: ['One more, then let it rest.', 'Still room beneath the mast.', 'Another card, quiet as rain.'],
    aggressive: ['Rarely worth the gale, yet here we are.', 'Double the stake? The sea remembers.', 'Two hands where one was enough.'],
    stay: ['Enough. Let the house row.', 'I will hold this shore.', 'No need to tempt the reef.'],
    bust: ['Too far out from harbor.', 'Over twenty-one. Back to the dock.', 'The net tore.'],
    win: ['Patience outlasts the storm.', 'Small catch, clean landing.', 'The quiet hand takes the pot.'],
    blackjack: ['Twenty-one on the first cast. Rare weather.', 'The wind blew straight to port.'],
    loss: ['The sea takes; the sea gives.', 'Another crossing, another toll.'],
    push: ['Even water. Nobody drowned.', 'Back where we cast off.'],
  },
  shevek: {
    idle: ["The math doesn't care how you feel.", 'Every shoe has a memory, briefly.', 'Variance is just patience in disguise.'],
    risky: ['Sixteen against strength: pure expected value.', 'Unpleasant total, unambiguous play.', 'The chart is clear even when the hand is not.'],
    hit: ['Drawing to improve the distribution.', 'Second draw; probability still favors action.', 'Still below the threshold.'],
    aggressive: ['Positive expectation—press the edge.', 'Doubling where the numbers demand it.', 'Splitting to maximize the variance.'],
    stay: ['Standing. Anything else leaks equity.', 'Optimal stop.', 'Let the dealer resolve the tail risk.'],
    bust: ['An outlier. It happens.', 'Left tail of the curve.', 'Over twenty-one; the model still holds.'],
    win: ['Expected value realized.', 'Clean convergence.', 'The sample size finally agrees.'],
    blackjack: ['Natural twenty-one. Zero variance required.', 'Exact solution in two cards.'],
    loss: ['Short-term noise.', 'Negative variance; proceed to the next trial.'],
    push: ['Zero net change. Equilibrium.', 'A tie—back to baseline.'],
  },
  haber: {
    idle: ['Whatever it is, double it.', 'I have a very good feeling about this shoe.', 'Fortune favors the bold—and me!'],
    risky: ['Sixteen? Practically a launching pad!', 'Tight spot! Time to dream bigger!', 'Looks ugly, plays great—watch this!'],
    hit: ['Hit me! Keep the momentum rolling!', 'Another! We are building something huge!', 'One more—I can feel the twenty-one coming!'],
    aggressive: ['DOUBLE IT! Always double!', 'Two hands, twice the glory!', 'Now we are really playing!'],
    stay: ['Fine, I will let the dealer sweat.', 'Standing—reluctantly!', 'Playing it cool for once.'],
    bust: ['Minor setback! Next hand is mine!', 'Too much ambition! Happens to visionaries!', 'Busted—just clearing out the bad cards!'],
    win: ['BOOM! Who doubted the system?!', 'Absolute clinic! Pay the man!', 'Victory! Write that one down!'],
    blackjack: ['BLACKJACK! Pure manifestation!', 'Twenty-one! Look at that efficiency!'],
    loss: ['Temporary dip! Double the next one!', 'Robbed by the shuffle!'],
    push: ['A push? Basically a moral victory.', 'My money comes right back—onto the next!'],
  },
  'genly-ai': {
    idle: ["One more card can't hurt. Probably.", 'Everyone here seems very calm about this.', 'Is this still part of the rules?'],
    risky: ['Sixteen again... why is it always sixteen?', 'I feel like the manual skipped this part.', 'This looks like a trap, doesn’t it?'],
    hit: ['Um, one more please, if that’s alright.', 'Still not twenty-one? Maybe one more.', 'I really hope this one is small.'],
    aggressive: ['Wait—did I just double my bet?', 'Two hands to keep track of now...', 'Well, when in Karhide...'],
    stay: ['I’ll stop here, thank you.', 'Better not push my luck.', 'Standing. Please don’t have a twenty.'],
    bust: ['Ah. Yes, that was too many.', 'I knew I should have stopped.', 'Twenty-two. Of course.'],
    win: ['Oh! I actually won? Wonderful!', 'Did that really beat the dealer?', 'Finally, a hand that went right!'],
    blackjack: ['Twenty-one! Wait—is that blackjack?!', 'Oh my! Two cards!'],
    loss: ['Ah well. Good game, everyone.', 'I think I miscounted again.'],
    push: ['Oh, a tie! That’s a relief.', 'Nobody lost? I’ll take it.'],
  },
  dealer: {
    idle: ['The house is patient.', 'Place your wagers.', 'Cards are ready.'],
    risky: ['Drawing on sixteen.', 'House rules decide.', 'One more from the shoe.'],
    hit: ['Dealer draws.', 'Still below seventeen.', 'Another card for the house.'],
    aggressive: ['House stands.', 'Seventeen or better.', 'Let us compare hands.'],
    stay: ['Dealer stands.', 'House holds.', 'Showdown.'],
    bust: ['Dealer busts.', 'Too many for the house.', 'House pays the table.'],
    win: ['House takes the hand.', 'The house prevails.', 'Better luck next deal.'],
    blackjack: ['Dealer blackjack.', 'House natural.', 'Twenty-one for the house.'],
    loss: ['Table takes this round.', 'House pays out.', 'Well played.'],
    push: ['Push.', 'Stakes returned.', 'Even with the house.'],
  },
};

function pick(lines: readonly string[], index: number): string {
  return lines[((index % lines.length) + lines.length) % lines.length];
}

/**
 * Choose a reactive line for an AI seat (or dealer) based on the current game state:
 * win-event celebrations override action lines, busts/losses/pushes follow, and active
 * turns advance sequentially through hit, risky, aggressive, and stay pools.
 */
export function botUtterance(state: GameState, playerKey: PlayerKey): string | undefined {
  const character = getCharacter(playerKey);
  const pool = DIALOGUE_POOLS[playerKey];
  const player = getPlayer(state.playerStore, playerKey);
  if (!character || !pool || !player) return character?.tagline;

  const handIndex = state.controllingPlayer === playerKey ? state.activeHandIndex : 0;
  const hand = getPlayerHand(state.deck, playerKey, handIndex);
  const roundIndex = Math.max(0, state.round);

  // 1. Win-event celebrations take highest priority
  if (player.result === 'blackjack' || hand?.isBlackjack) {
    return pick(pool.blackjack, roundIndex);
  }
  if (player.result === 'win') {
    return pick(pool.win, roundIndex + (player.net && player.net > state.minimumBet ? 1 : 0));
  }

  // 2. Other settled / busted states
  if (player.isBusted || hand?.isBusted) {
    return pick(pool.bust, roundIndex);
  }
  if (player.result === 'push') {
    return pick(pool.push, roundIndex);
  }
  if (player.result === 'loss') {
    return pick(pool.loss, roundIndex);
  }

  // 3. Active hand triggers
  if (hand && hand.cards.length >= 2) {
    const stake = hand.stake ?? roundStake(state, playerKey);
    const doubled = stake > roundStake(state, playerKey) || (hand.cards.length === 3 && state.activityLog.some(
      (entry) => entry.round === state.round && entry.name === player.title && entry.event === 'double',
    ));
    if (doubled || hand.isSplit) {
      return pick(pool.aggressive, state.turnCount + hand.cards.length);
    }
    if (player.isStaying || hand.isStaying) {
      return pick(pool.stay, roundIndex);
    }

    const total = hand.handValue.highest;
    if (hand.cards.length > 2) {
      const step = hand.cards.length - 3;
      if (total >= 12 && total <= 16) {
        return pick(pool.risky, step + roundIndex);
      }
      return pick(pool.hit, step);
    }
    if (total >= 12 && total <= 16) {
      return pick(pool.risky, roundIndex);
    }
  }

  return state.round > 0 ? pick(pool.idle, roundIndex) : character.tagline;
}
