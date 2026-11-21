import React from 'react';
import { Avatar, Button, Text, makeStyles, tokens } from '@fluentui/react-components';
import { useGameContext, useProfileContext, useSettingContext } from '../context';
import { GameAction } from '../enums';
import { botAccountsFor, defaultProfileState, seatsFor } from '../functions/profiles';
import { GoogleUser, loadSyncState, signInWithGoogle, signOutGoogle, subscribeSyncState } from '../functions/remote';
import { isDarkMode, resolveThemeMode, usePrefersDark } from '../theme';

export const GOOGLE_GSI_SRC = 'https://accounts.google.com/gsi/client';

export type GoogleCredentialResponse = { credential?: string };

export type GoogleIdConfiguration = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
};

export type GoogleIdApi = {
  initialize: (config: GoogleIdConfiguration) => void;
  renderButton: (parent: HTMLElement, options: Record<string, string>) => void;
  disableAutoSelect?: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleIdApi;
      };
    };
  }
}

const useStyles = makeStyles({
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalXS,
    padding: tokens.spacingVerticalS,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
  },
  identity: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minWidth: 0,
  },
  identityText: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  subtle: {
    color: tokens.colorNeutralForeground3,
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
    marginTop: tokens.spacingVerticalXS,
  },
});

/** Read the configured Google OAuth Client ID from Vite's environment, if any */
export function getGoogleClientId(): string | undefined {
  const raw = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

let gsiLoading: Promise<GoogleIdApi | undefined> | undefined;

function loadGoogleScript(): Promise<GoogleIdApi | undefined> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (!gsiLoading) {
    gsiLoading = new Promise<GoogleIdApi | undefined>((resolve) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_GSI_SRC}"]`);
      const script = existing ?? document.createElement('script');
      const finish = () => resolve(window.google?.accounts?.id);
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', () => resolve(undefined), { once: true });
      if (!existing) {
        script.src = GOOGLE_GSI_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }).finally(() => {
      gsiLoading = undefined;
    });
  }
  return gsiLoading;
}

export type GoogleAccountSectionProps = {
  /** Override for tests; defaults to VITE_GOOGLE_CLIENT_ID */
  clientId?: string;
};

/**
 * Google Sign-In and account status section at the top of the Players dialog.
 * Hidden when no Google Client ID is configured and no user is signed in.
 */
export const GoogleAccountSection: React.FC<GoogleAccountSectionProps> = ({ clientId }) => {
  const styles = useStyles();
  const { profileDispatch } = useProfileContext();
  const { gameDispatch } = useGameContext();
  const { settings } = useSettingContext();
  const prefersDark = usePrefersDark();
  const dark = isDarkMode(resolveThemeMode(settings.themeMode, prefersDark));

  const activeClientId = clientId ?? getGoogleClientId();
  const [user, setUser] = React.useState<GoogleUser | undefined>(() => loadSyncState().user);
  const [error, setError] = React.useState<string>();
  const buttonRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => subscribeSyncState(() => setUser(loadSyncState().user)), []);

  React.useEffect(() => {
    if (user || !activeClientId) return;
    let cancelled = false;
    const container = buttonRef.current;
    if (!container) return;

    void loadGoogleScript().then((api) => {
      if (cancelled || !api || !buttonRef.current) return;
      api.initialize({
        client_id: activeClientId,
        callback: (response) => {
          if (!response.credential) return;
          setError(undefined);
          void signInWithGoogle(response.credential).then((result) => {
            if (!cancelled && 'error' in result) {
              setError(result.error);
            }
          });
        },
      });
      buttonRef.current.innerHTML = '';
      api.renderButton(buttonRef.current, {
        theme: dark ? 'filled_black' : 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
      });
    });

    return () => {
      cancelled = true;
    };
  }, [activeClientId, dark, user]);

  const handleSignOut = () => {
    window.google?.accounts?.id?.disableAutoSelect?.();
    setError(undefined);
    signOutGoogle();
    const defaults = defaultProfileState();
    profileDispatch({ type: 'reset' });
    gameDispatch({ type: GameAction.NewGame, players: seatsFor(defaults), botAccounts: botAccountsFor(defaults) });
  };

  if (!user && !activeClientId) return null;

  return (
    <section aria-labelledby="players-account-heading">
      <Text as="h3" id="players-account-heading" weight="semibold" block>Google Account</Text>
      {user ? (
        <div className={styles.card}>
          <div className={styles.identity}>
            <Avatar
              name={user.name}
              image={user.picture ? { src: user.picture } : undefined}
              size={36}
            />
            <div className={styles.identityText}>
              <Text weight="semibold">{user.name}</Text>
              {user.email && <Text size={200} className={styles.subtle}>{user.email}</Text>}
              <Text size={200} className={styles.subtle}>
                Players, lifetime statistics, and current game sync across browsers.
              </Text>
            </div>
          </div>
          <Button appearance="secondary" onClick={handleSignOut}>Sign out</Button>
        </div>
      ) : (
        <div className={styles.card}>
          <div className={styles.identityText}>
            <Text size={200}>
              Sign in with Google to save your players, lifetime statistics, and game in progress across browsers.
            </Text>
            {error && (
              <Text role="alert" size={200} className={styles.error} block>
                {error}
              </Text>
            )}
          </div>
          <div ref={buttonRef} data-testid="google-signin-button" />
        </div>
      )}
    </section>
  );
};
