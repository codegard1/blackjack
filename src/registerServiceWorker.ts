import { registerSW } from 'virtual:pwa-register';
import { debugLog } from './functions/debugLog';

export function registerServiceWorker(): void {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;

      const checkForUpdate = () => {
        if (navigator.onLine) {
          void registration.update().catch((error: unknown) => debugLog('Service worker update failed', error));
        }
      };
      window.setInterval(checkForUpdate, 60 * 60 * 1000);
      window.addEventListener('online', checkForUpdate);
    },
    onRegisterError(error: unknown) {
      debugLog('Service worker registration failed', error);
    },
  });
}
