import React from 'react';

const DARK_QUERY = '(prefers-color-scheme: dark)';

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

const getSnapshot = () => window.matchMedia(DARK_QUERY).matches;

/** Whether the operating system asks for a dark color scheme; updates when it changes */
export function usePrefersDark(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}
