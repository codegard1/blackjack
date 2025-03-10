// React
import React from "react";

// Fluent UI
import {
  Dialog, DialogFooter, DialogType, Dropdown, IDropdownOption, PrimaryButton, ResponsiveMode, Text,
} from '@fluentui/react';

import { useGameContext, useSettingContext } from '../context';
import {
  defaultPlayersDropdownOptions,
  defaultSelectedPlayerKeys
} from "../definitions";
import { GameAction } from "../enums";
import { PlayerKey } from "../types";
import { IPlayer } from "../interfaces";


export const SplashScreen: React.FC = () => {

  // Context
  const { settings, toggleSetting } = useSettingContext();
  const { gameState, gameDispatch } = useGameContext();

  // State
  const [selectedPlayers, setSelectedPlayers] = React.useState<PlayerKey[]>(defaultSelectedPlayerKeys);
  const [errorMessage, setErrorMessage] = React.useState<string>();

  const onChangeDropDown = (event: React.FormEvent<HTMLDivElement>, option: IDropdownOption<IPlayer> | undefined, index?: number): void => {
    if (!!option) {
      const { key, selected } = option;
      const _selectedPlayers = selectedPlayers.slice();
      const _ix = _selectedPlayers.indexOf(key as PlayerKey);
      if (true === selected && _ix === -1) _selectedPlayers.push(key as PlayerKey);
      if (false === selected && _ix !== -1) _selectedPlayers.splice(_ix, 1);
      setSelectedPlayers(_selectedPlayers);
    }
  }

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
      hidden={!settings.isSplashScreenVisible}
      dialogContentProps={{
        type: DialogType.normal,
        title: 'Blackjack',
        subText: 'This is the splash screen',
        onDismiss: onDismissDialog,
        showCloseButton: true,
        // responsiveMode: ResponsiveMode.small,
        closeButtonAriaLabel: 'Close dialog',
      }}
      modalProps={{
        isBlocking: true,
        styles: { main: { maxWidth: 450, top: 125 } },
        isDarkOverlay: true,
        topOffsetFixed: true,
        onDismiss: () => onDismissDialog,
        onDismissed: () => onDismissDialog,
      }}
      responsiveMode={ResponsiveMode.medium}
      onDismiss={onDismissDialog}
    >
      <Dropdown
        placeholder="Choose"
        label="Select at least two players"
        multiSelect
        onChange={onChangeDropDown}
        options={defaultPlayersDropdownOptions}
        defaultSelectedKeys={selectedPlayers}
      />
      <Text block styles={{ root: { margin: '1em', color: 'salmon' } }}>{errorMessage}</Text>
      <DialogFooter>
        <PrimaryButton text="Start" onClick={onClickStartButton} />
      </DialogFooter>
    </Dialog >
  );
}
