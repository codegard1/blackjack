import { describe, expect, it } from 'vitest';
import { getCharacter } from './characters';
import {
  WORK_TASKS,
  appendBalance,
  chooseTask,
  daysRemaining,
  defaultBotAccount,
  describeCharacterWork,
  getWorkTask,
  returnThreshold,
} from './work';
import { MAX_BALANCE_HISTORY } from '../../shared';

describe('work tasks and character choices', () => {
  it('computes distinct personality-based return thresholds at a $25 ante', () => {
    const ogion = getCharacter('ogion')!.stats!;
    const shevek = getCharacter('shevek')!.stats!;
    const genly = getCharacter('genly-ai')!.stats!;
    const haber = getCharacter('haber')!.stats!;

    // The Rock waits for a healthy bank ($300); The Maniac returns as soon as the ante is covered ($25)
    expect(returnThreshold(ogion, 25)).toBe(300);
    expect(returnThreshold(shevek, 25)).toBe(275);
    expect(returnThreshold(genly, 25)).toBe(100);
    expect(returnThreshold(haber, 25)).toBe(25);
  });

  it('chooses tasks according to character temperament and how much they need', () => {
    const ogion = getCharacter('ogion')!.stats!;
    const shevek = getCharacter('shevek')!.stats!;
    const genly = getCharacter('genly-ai')!.stats!;
    const haber = getCharacter('haber')!.stats!;

    // Haber is impatient and aggressive: takes the quick 1-day rock-smashing job
    expect(chooseTask(haber, 0, returnThreshold(haber, 25))).toBe('smashing-rocks');

    // Genly Ai wants $100 without spending a whole week away: picks 2-day dreaming trials
    expect(chooseTask(genly, 0, returnThreshold(genly, 25))).toBe('dreaming-trials');

    // Disciplined characters starting at $0 take the well-paid Gobrin Ice expedition
    expect(chooseTask(ogion, 0, returnThreshold(ogion, 25))).toBe('gobrin-ice');
    expect(chooseTask(shevek, 0, returnThreshold(shevek, 25))).toBe('gobrin-ice');

    // When a disciplined character only needs a small top-up, they switch to a shorter job
    expect(chooseTask(ogion, 200, 300)).toBe('dreaming-trials');
  });

  it('never picks weaving baskets on its own unless forced by an override', () => {
    for (const id of ['ogion', 'shevek', 'haber', 'genly-ai']) {
      const stats = getCharacter(id)!.stats!;
      const threshold = returnThreshold(stats, 25);
      expect(chooseTask(stats, 0, threshold)).not.toBe('weaving-baskets');
    }
    expect(getWorkTask('weaving-baskets').days).toBe(7);
    expect(getWorkTask('weaving-baskets').pay).toBe(1);
  });

  it('tracks remaining days and caps balance history at MAX_BALANCE_HISTORY', () => {
    expect(daysRemaining({ status: 'working', taskId: 'herding-goats', daysWorked: 1 })).toBe(2);
    expect(daysRemaining({ status: 'working', taskId: 'herding-goats', daysWorked: 5 })).toBe(0);

    let history = [1000];
    for (let i = 1; i <= MAX_BALANCE_HISTORY + 20; i++) {
      history = appendBalance(history, i);
    }
    expect(history).toHaveLength(MAX_BALANCE_HISTORY);
    expect(history.at(-1)).toBe(MAX_BALANCE_HISTORY + 20);
  });

  it('describes at-table, working, and ready-to-return states clearly', () => {
    const base = defaultBotAccount(250);
    expect(describeCharacterWork('ogion', base, 25, true)).toContain('At the table · $250');

    const working = {
      ...base,
      bank: 10,
      work: { status: 'working' as const, taskId: 'herding-goats' as const, daysWorked: 1 },
    };
    expect(describeCharacterWork('ogion', working, 25, true)).toContain('Away working: Herding goats on Gont (2 days left, +$120) · $10 / $300');

    const ready = {
      ...base,
      bank: 300,
      work: { status: 'ready' as const, taskId: 'gobrin-ice' as const, daysWorked: 7 },
    };
    expect(describeCharacterWork('ogion', ready, 25, true)).toContain('Ready to return · Has $300 (threshold $300) and wants back in');
    expect(WORK_TASKS.length).toBe(7);
  });
});
