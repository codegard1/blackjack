/** A whole number with thousands separators, e.g. 6,390 */
export function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * A signed amount of money, e.g. +$1,234, −$5,466 or $0. Uses a true minus sign,
 * which screen readers read as "minus".
 */
export function formatNet(value: number): string {
  const amount = `$${formatCount(Math.abs(value))}`;
  return value > 0 ? `+${amount}` : value < 0 ? `−${amount}` : amount;
}
