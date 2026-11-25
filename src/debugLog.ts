/**
 * Log to the console in development builds only.
 * Silent in production and during test runs.
 */
export function debugLog(...args: unknown[]): void {
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
    console.debug(...args);
  }
}
