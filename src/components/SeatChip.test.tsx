import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { playerDefaults } from '../definitions';
import { IPlayer } from '../interfaces';
import { SeatChip } from './SeatChip';

const chris: IPlayer = { ...playerDefaults, key: 'chris', title: 'Chris', bank: 975 };
const shevek: IPlayer = { ...playerDefaults, key: 'shevek', title: 'Shevek', bank: 975 };

describe('SeatChip', () => {
  afterEach(() => vi.restoreAllMocks());

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

  it('shows the complete dialogue in a tooltip on the dialogue span', () => {
    const dialogue = 'Negative variance; proceed to the next trial.';
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(240);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(180);

    const { container } = render(<SeatChip player={shevek} utterance={dialogue} onSelect={() => {}} />);

    expect(container.querySelector('.seat-chip-tagline')).toHaveAttribute('title', dialogue);
  });

  it('also exposes the complete dialogue as a tooltip when it fits', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(180);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(180);

    const { container } = render(<SeatChip player={shevek} utterance="Expected value realized." onSelect={() => {}} />);

    expect(container.querySelector('.seat-chip-tagline')).toHaveAttribute('title', 'Expected value realized.');
  });
});
