import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { loadSyncState, saveSyncState } from '../functions/remote';
import { GoogleCredentialResponse, GoogleIdConfiguration } from './GoogleAccountSection';

const GOOGLE_OWNER = 'google:107691503500061507151.c2lnbmVkLWJ5LXRoZS1zZXJ2ZXItZm9yLXRlc3RzLTAx';
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => {
  delete window.google;
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('GoogleAccountSection in PlayersDialog', () => {
  it('stays hidden when no VITE_GOOGLE_CLIENT_ID is configured and no user is signed in', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Players' }));
    await act(async () => { await vi.dynamicImportSettled(); });
    const dialog = screen.getByRole('dialog', { name: 'Players' });
    expect(within(dialog).queryByRole('heading', { name: 'Google Account' })).not.toBeInTheDocument();
  });

  it('renders the Google Sign-In button when configured, signs in via /api/owner, and resets on sign-out', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '123456-test.apps.googleusercontent.com');

    let capturedCallback: ((response: GoogleCredentialResponse) => void) | undefined;
    const disableAutoSelect = vi.fn();
    window.google = {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfiguration) => {
            capturedCallback = config.callback;
          },
          renderButton: (parent: HTMLElement) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = 'Sign in with Google';
            btn.onclick = () => capturedCallback?.({ credential: 'mock.google.jwt' });
            parent.appendChild(btn);
          },
          disableAutoSelect,
        },
      },
    };

    const user = {
      name: 'Chris Odegard',
      email: 'chris@example.com',
      picture: 'https://lh3.googleusercontent.com/a/avatar',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ownerId: GOOGLE_OWNER, user }, 200)));

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Players' }));
    await act(async () => { await vi.dynamicImportSettled(); });
    const dialog = screen.getByRole('dialog', { name: 'Players' });

    // Create a local player before signing in
    fireEvent.change(within(dialog).getByPlaceholderText('Name'), { target: { value: 'Alex' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add player' }));
    expect(within(dialog).getByRole('radio', { name: 'Alex' })).toBeInTheDocument();

    // Wait for the Google button to render, then click it
    const signInButton = await within(dialog).findByRole('button', { name: 'Sign in with Google' });
    await act(async () => {
      fireEvent.click(signInButton);
      await Promise.resolve();
    });

    expect(within(dialog).getByText('Chris Odegard')).toBeInTheDocument();
    expect(within(dialog).getByText('chris@example.com')).toBeInTheDocument();
    expect(loadSyncState().ownerId).toBe(GOOGLE_OWNER);

    // Signing out clears the Google account and resets local profiles back to defaults
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sign out' }));
    expect(disableAutoSelect).toHaveBeenCalledTimes(1);
    expect(loadSyncState().ownerId).toBeUndefined();
    expect(loadSyncState().user).toBeUndefined();
    expect(within(dialog).queryByRole('radio', { name: 'Alex' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: 'Chris' })).toBeChecked();
  });

  it('shows an error alert when the server rejects the Google credential', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '123456-test.apps.googleusercontent.com');
    let capturedCallback: ((response: GoogleCredentialResponse) => void) | undefined;
    window.google = {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfiguration) => {
            capturedCallback = config.callback;
          },
          renderButton: (parent: HTMLElement) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = 'Sign in with Google';
            btn.onclick = () => capturedCallback?.({ credential: 'expired.google.jwt' });
            parent.appendChild(btn);
          },
        },
      },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'Invalid Google credential.' }, 401)));

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Players' }));
    await act(async () => { await vi.dynamicImportSettled(); });
    const dialog = screen.getByRole('dialog', { name: 'Players' });

    const signInButton = await within(dialog).findByRole('button', { name: 'Sign in with Google' });
    await act(async () => {
      fireEvent.click(signInButton);
      await Promise.resolve();
    });

    expect(within(dialog).getByRole('alert')).toHaveTextContent('Invalid Google credential.');
  });

  it('resets bot account work settings and app settings on sign-out even after a game has started', async () => {
    saveSyncState({
      ownerId: GOOGLE_OWNER,
      user: { name: 'Chris Odegard', email: 'chris@example.com' },
      syncedAt: { profiles: 0, game: 0, settings: 0 },
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    await act(async () => { await vi.dynamicImportSettled(); });
    fireEvent.click(await screen.findByRole('radio', { name: 'Light' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close options' }));
    expect(document.querySelector('[data-theme-mode]')).toHaveAttribute('data-theme-mode', 'light');

    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Players' }));
    await act(async () => { await vi.dynamicImportSettled(); });
    const dialog = await screen.findByRole('dialog', { name: 'Players' }, { timeout: 5000 });

    const ogionItem = within(dialog).getByRole('checkbox', { name: /Ogion/ }).closest('li')!;
    const allowReturnSwitch = within(ogionItem).getByRole('switch', { name: 'Let back when ready' });
    fireEvent.click(allowReturnSwitch);
    expect(allowReturnSwitch).toBeChecked();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Sign out' }));
    expect(allowReturnSwitch).not.toBeChecked();
    expect(document.querySelector('[data-theme-mode]')).toHaveAttribute('data-theme-mode', 'dark');
  });
});
