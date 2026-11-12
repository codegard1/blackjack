import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { playerDefaults } from '../definitions';
import { IPlayer } from '../interfaces';
import { SeatChip } from './SeatChip';

const chris: IPlayer = { ...playerDefaults, key: 'chris', title: 'Chris', bank: 975 };

describe('SeatChip', () => {
  it('shows the name, bank and status tag', () => {
    const { container } = render(<SeatChip player={chris} status={{ text: 'Standing', color: 'subtle', appearance: 'tint' }} />);
    expect(container).toHaveTextContent('Chris ($975)');
    expect(container).toHaveTextContent('Standing');
  });

  it('is not in focus unless a result is being told for its seat', () => {
    const { container } = render(<SeatChip player={chris} />);
    expect(container.querySelector('.seat-chip')).not.toHaveAttribute('data-focus');
  });

  it.each(['success', 'danger', 'info'] as const)('is in focus with the %s tone of its result', (tone) => {
    const { container } = render(<SeatChip player={chris} focus={tone} />);
    const chip = container.querySelector<HTMLElement>('.seat-chip');
    expect(chip).toHaveAttribute('data-focus', tone);
    // the ring takes the result's color through a custom property
    expect(chip?.style.getPropertyValue('--seat-chip-focus')).not.toBe('');
  });

  it('keeps the floating delay beside the focus ring', () => {
    const { container } = render(<SeatChip player={chris} floating index={2} focus="success" />);
    const chip = container.querySelector<HTMLElement>('.seat-chip');
    expect(chip?.style.animationDelay).toBe('900ms');
    expect(chip?.style.getPropertyValue('--seat-chip-focus')).not.toBe('');
  });
});
