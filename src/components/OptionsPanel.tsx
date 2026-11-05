// React
import React from "react";

import {
  Button,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  Divider,
  Link,
  Switch,
  Text,
  Tooltip,
} from '@fluentui/react-components';
import {
  ArrowClockwise20Regular,
  ArrowSync20Regular,
  Delete20Regular,
  Dismiss20Regular,
  Stack20Regular,
} from '@fluentui/react-icons';

// Context
import { useGameContext, useProfileContext, useSettingContext } from "../context";
import { GameAction } from "../enums";
import { clearStores } from "../functions";

export const OptionsPanel: React.FC = () => {

  // Context
  const { settings, toggleSetting } = useSettingContext();
  const { gameState, gameDispatch } = useGameContext();
  const { profileDispatch } = useProfileContext();
  const playerStore = gameState.playerStore;

  const closeOptionsPanel = () => {
    toggleSetting({ key: "isOptionsPanelVisible", value: false });
  }

  /**
   * Reset the game from the Options Panel
   */
  const resetGame = () => {
    gameDispatch({ type: GameAction.ResetGame });
    gameDispatch({ type: GameAction.ShowMessageBar, messageBarDefinition: { text: 'Game Reset', type: 'info', isMultiLine: false } });
    closeOptionsPanel();
  }

  const clearApplicationData = () => {
    clearStores();
    gameDispatch({ type: GameAction.ResetGame, clearActivityLog: true });
    profileDispatch({ type: 'reset' });
    toggleSetting({ key: 'reset' });
  }

  const newDeal = () => {
    gameDispatch({ type: GameAction.Deal });
    closeOptionsPanel();
  }

  const shuffle = () => {
    gameDispatch({ type: GameAction.Shuffle });
    closeOptionsPanel();
  }

  return (
    <Drawer
      open={settings.isOptionsPanelVisible}
      onOpenChange={(_, data) => {
        if (!data.open) closeOptionsPanel();
      }}
      position="end"
      size="small"
      modalType="modal"
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close options"
              icon={<Dismiss20Regular />}
              onClick={closeOptionsPanel}
            />
          }
        >
          Options
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        <div className="options-panel-actions">
          <Tooltip content="Start a new round with the selected players" relationship="label">
            <Button icon={<Stack20Regular />} onClick={newDeal}>Deal</Button>
          </Tooltip>
          <Tooltip content="Reset the game with initial parameters" relationship="label">
            <Button icon={<ArrowClockwise20Regular />} onClick={resetGame}>Reset Game</Button>
          </Tooltip>
          <Tooltip content="Shuffle the remaining deck" relationship="label">
            <Button icon={<ArrowSync20Regular />} onClick={shuffle}>Shuffle Deck</Button>
          </Tooltip>
          <Tooltip content="Clear application data stored locally in the browser" relationship="label">
            <Button icon={<Delete20Regular />} onClick={clearApplicationData}>Clear Stores</Button>
          </Tooltip>
        </div>

        <Divider />

        <div className="options-panel-switches">
          <Switch checked={settings.isDeckVisible} label="Show Deck" onChange={(_, data) => toggleSetting({ key: 'isDeckVisible', value: data.checked })} />
          <Switch checked={settings.isDrawnVisible} label="Show Drawn" onChange={(_, data) => toggleSetting({ key: 'isDrawnVisible', value: data.checked })} />
          <Switch checked={settings.isSelectedVisible} label="Show Selected" onChange={(_, data) => toggleSetting({ key: 'isSelectedVisible', value: data.checked })} />
          <Switch checked={settings.isDealerHandVisible} label="Show Dealer Hand" onChange={(_, data) => toggleSetting({ key: 'isDealerHandVisible', value: data.checked })} />
          <Switch checked={settings.isHandValueVisible} label="Show Hand Value" onChange={(_, data) => toggleSetting({ key: 'isHandValueVisible', value: data.checked })} />
          <Switch checked={settings.isActivityLogVisible} label="Show Activity Log" onChange={(_, data) => toggleSetting({ key: 'isActivityLogVisible', value: data.checked })} />
          <Switch checked={settings.isDebugWindowVisible} label="Show Debug Window" onChange={(_, data) => toggleSetting({ key: 'isDebugWindowVisible', value: data.checked })} />
        </div>

        <Divider />

        <Text weight="semibold">Chris's Blackjack</Text>
        <Text size={200}>
          &copy;2026 <Link href="https://github.com/codegard1/blackjack">Chris Odegard</Link>
          <br />
          Made in Brooklyn with <Link href="https://react.dev/">React</Link> and <Link href="https://developer.microsoft.com/en-us/fluentui">Fluent UI</Link>.
        </Text>
      </DrawerBody>
    </Drawer>
  );
}
