// React
import React from "react";

import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Divider,
  Link,
  Text,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { BookOpen24Regular, Info24Regular, People24Regular, Settings24Regular } from '@fluentui/react-icons';

// Local Resources
import { usePlayersDialog, useSettingContext } from '../context';
import { AppLogo } from './AppLogo';
import { RulesDialog } from './RulesDialog';
import { description, repository, version } from '../../package.json';

export const APP_NAME = "Chris's Blackjack";

const useStyles = makeStyles({
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow8,
    marginBottom: tokens.spacingVerticalM,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minWidth: 0,
  },
  title: {
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    flexShrink: 0,
  },
  about: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  aboutHero: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  aboutMeta: {
    display: 'grid',
    gridTemplateColumns: 'max-content 1fr',
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalXS,
    margin: 0,
  },
  term: {
    color: tokens.colorNeutralForeground3,
  },
  definition: {
    margin: 0,
  },
});

const repositoryUrl = typeof repository === 'string' ? repository : repository.url;

/**
 * Sticky app bar with the app name, an About dialog, and the settings toggle
 */
export const AppHeader: React.FC = () => {
  const styles = useStyles();
  const { settings, toggleSetting } = useSettingContext();

  const openPlayers = usePlayersDialog();
  const [isRulesOpen, setRulesOpen] = React.useState(false);

  const toggleOptionsPanel = () =>
    toggleSetting({ key: 'isOptionsPanelVisible', value: !settings.isOptionsPanelVisible });

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <AppLogo size={32} />
        <Text as="h1" size={500} weight="semibold" className={styles.title}>{APP_NAME}</Text>
      </div>

      <div className={styles.actions}>
        <Tooltip content="Blackjack rules" relationship="label">
          <Button appearance="subtle" aria-label="Blackjack rules" icon={<BookOpen24Regular />} onClick={() => setRulesOpen(true)} />
        </Tooltip>
        <RulesDialog open={isRulesOpen} onOpenChange={setRulesOpen} />
        <Tooltip content="Players" relationship="label">
          <Button appearance="subtle" aria-label="Players" icon={<People24Regular />} onClick={openPlayers} />
        </Tooltip>
        <Dialog>
          <DialogTrigger disableButtonEnhancement>
            <Tooltip content="About" relationship="label">
              <Button appearance="subtle" icon={<Info24Regular />} />
            </Tooltip>
          </DialogTrigger>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>About {APP_NAME}</DialogTitle>
              <DialogContent className={styles.about}>
                <div className={styles.aboutHero}>
                  <AppLogo size={56} />
                  <div>
                    <Text as="p" size={500} weight="semibold" block>{APP_NAME}</Text>
                    <Text as="p" block>Version {version}</Text>
                  </div>
                </div>
                <Text as="p" block>
                  {description}. You and up to four computer players each take on a dealer
                  who hits below 17, with pushes, 3:2 blackjacks and double down.
                </Text>
                <Divider />
                <dl className={styles.aboutMeta}>
                  <dt className={styles.term}>Author</dt>
                  <dd className={styles.definition}>Chris Odegard</dd>
                  <dt className={styles.term}>Built with</dt>
                  <dd className={styles.definition}>React, TypeScript, Fluent UI and Vite</dd>
                  <dt className={styles.term}>Source</dt>
                  <dd className={styles.definition}>
                    <Link href={repositoryUrl} target="_blank" rel="noopener noreferrer" inline>{repositoryUrl.replace(/^https?:\/\//, '')}</Link>
                  </dd>
                </dl>
                <Text as="p" size={200} className={styles.term} block>
                  Your game and settings are saved in this browser only.
                </Text>
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="primary">OK</Button>
                </DialogTrigger>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>

        <Tooltip content="Settings" relationship="label">
          <Button appearance="subtle" icon={<Settings24Regular />} onClick={toggleOptionsPanel} aria-expanded={settings.isOptionsPanelVisible} />
        </Tooltip>
      </div>
    </header>
  );
}
