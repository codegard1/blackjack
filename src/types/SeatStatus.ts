/**
 * Short status label shown on a seat or a collapsed seat chip
 */
export type SeatStatus = {
  text: string;
  color: 'brand' | 'success' | 'danger' | 'informative' | 'subtle';
  appearance: 'filled' | 'tint';
};
