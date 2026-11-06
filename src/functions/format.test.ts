import { describe, expect, it } from 'vitest';
import { formatCount, formatNet } from './format';

describe('formatting', () => {
  it('adds thousands separators to counts', () => {
    expect(formatCount(6390)).toBe('6,390');
    expect(formatCount(12)).toBe('12');
  });

  it('signs a net result, with a true minus sign for a loss', () => {
    expect(formatNet(85107)).toBe('+$85,107');
    expect(formatNet(-5466)).toBe('−$5,466');
    expect(formatNet(0)).toBe('$0');
  });
});
