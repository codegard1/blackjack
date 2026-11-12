import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from './public/manifest.json';

describe('PWA installation assets', () => {
  it('defines a standalone app with brand colors and a stable root scope', () => {
    expect(manifest).toMatchObject({
      name: "Chris Odegard's Blackjack",
      short_name: 'Blackjack',
      id: '/',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: '#0f6cbd',
      background_color: '#ebf3fc',
    });
  });

  it.each([192, 512])('provides a real %i px maskable PNG', (size) => {
    const icon = manifest.icons.find((entry) => entry.sizes === `${size}x${size}`);
    expect(icon).toMatchObject({ type: 'image/png', purpose: 'any maskable' });
    const png = readFileSync(resolve('public', icon!.src.slice(1)));
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(png.readUInt32BE(16)).toBe(size);
    expect(png.readUInt32BE(20)).toBe(size);
  });
});
