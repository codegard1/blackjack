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
  Dropdown,
  Label,
  Option,
  Text,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';

import { useGameContext, useSettingContext } from '../context';
import {
  defaultplayersArr,
  defaultSelectedPlayerKeys
} from "../definitions";
import { GameAction } from "../enums";
import { PlayerKey } from "../types";


export const SplashScreen: React.FC = () => {

  // Context
  const { settings, toggleSetting } = useSettingContext();
  const { gameState, gameDispatch } = useGameContext();

  // State
  const [selectedPlayers, setSelectedPlayers] = React.useState<PlayerKey[]>(defaultSelectedPlayerKeys);
  const [errorMessage, setErrorMessage] = React.useState<string>();

  function onDismissDialog() {
    toggleSetting({ key: 'isSplashScreenVisible', value: false })
  }

  // Start a new game with the selected players
  function onClickStartButton() {
    if (selectedPlayers.length < 2) {
      setErrorMessage('You must select at least 2 players');
      return;
    } else {
      // initiate a new game     
      gameDispatch({ type: GameAction.NewGame, playerKey: selectedPlayers });
      onDismissDialog();
    }
  }

  return (
    <Dialog
      open={settings.isSplashScreenVisible}
      onOpenChange={(_, data) => {
        if (!data.open) onDismissDialog();
      }}
      modalType="alert"
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle
            action={
              <Button
                appearance="subtle"
                aria-label="Close dialog"
                icon={<Dismiss24Regular />}
                onClick={onDismissDialog}
              />
            }
          >
            Blackjack
          </DialogTitle>
          <DialogContent>
            <p>This is the splash screen</p>
            <Label id="player-selection-label">Select at least two players</Label>
            <Dropdown
              aria-labelledby="player-selection-label"
              placeholder="Choose"
              multiselect
              selectedOptions={selectedPlayers}
              onOptionSelect={(_, data) => setSelectedPlayers(data.selectedOptions as PlayerKey[])}
            >
              {defaultplayersArr.map((player) => (
                <Option key={player.key} value={player.key}>{player.title}</Option>
              ))}
            </Dropdown>
            {errorMessage && <Text style={{ color: 'salmon', marginTop: '1em' }}>{errorMessage}</Text>}
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={onClickStartButton}>Start</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
