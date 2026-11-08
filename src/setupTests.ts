// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
	cleanup();
	localStorage.clear();
});

// jsdom has no matchMedia; the theme's system mode reads prefers-color-scheme through it.
// jsdom cannot play animations either, so report reduced motion and skip waits for them;
// tests of an animation's wait override this.
if (typeof window.matchMedia !== 'function') {
	window.matchMedia = (query: string): MediaQueryList => ({
		matches: query.includes('prefers-reduced-motion: reduce'),
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
	});
}

globalThis.ResizeObserver = class ResizeObserver {
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
};
