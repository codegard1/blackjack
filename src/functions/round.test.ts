import { describe, expect, it } from 'vitest';
import { seatQueues } from './round';

// Chris plays first, the computer players next, the dealer last
const turnOrder = ['chris', 'ogion', 'shevek', 'dealer'];

describe('seatQueues', () => {
  it('lists the seats in the reverse of turn order, the dealer first', () => {
    expect(seatQueues(turnOrder, undefined, undefined, false)).toEqual({
      waiting: ['dealer', 'shevek', 'ogion', 'chris'],
      played: [],
    });
  });

  it('keeps the seat on the stage out of both lists', () => {
    const { waiting, played } = seatQueues(turnOrder, 'chris', 'chris', false);
    expect([...waiting, ...played]).not.toContain('chris');
  });

  it('has everyone still to play wait above the stage while the first seat plays', () => {
    expect(seatQueues(turnOrder, 'chris', 'chris', false)).toEqual({
      waiting: ['dealer', 'shevek', 'ogion'],
      played: [],
    });
  });

  it('moves a seat below the stage when its turn is over, ahead of those that played before it', () => {
    expect(seatQueues(turnOrder, 'shevek', 'shevek', false)).toEqual({
      waiting: ['dealer'],
      played: ['ogion', 'chris'],
    });
  });

  it('leaves nobody waiting when the dealer plays, with the first to play at the bottom', () => {
    expect(seatQueues(turnOrder, 'dealer', 'dealer', false)).toEqual({
      waiting: [],
      played: ['shevek', 'ogion', 'chris'],
    });
  });

  it('counts the seat in control as waiting when another seat has been brought to the stage', () => {
    // the user brought Shevek forward during Ogion's turn: Ogion is still up next, closest to the stage
    expect(seatQueues(turnOrder, 'shevek', 'ogion', false)).toEqual({
      waiting: ['dealer', 'ogion'],
      played: ['chris'],
    });
  });

  it('has every seat below the stage once the round is over, the dealer closest to it', () => {
    expect(seatQueues(turnOrder, 'chris', undefined, true)).toEqual({
      waiting: [],
      played: ['dealer', 'shevek', 'ogion'],
    });
  });

  it('keeps a seat waiting after the round is over while its card turns', () => {
    expect(seatQueues(turnOrder, 'chris', undefined, true, 'dealer')).toEqual({
      waiting: ['dealer'],
      played: ['shevek', 'ogion'],
    });
  });

  it('copes with no seats', () => {
    expect(seatQueues([], undefined, undefined, false)).toEqual({ waiting: [], played: [] });
  });
});
