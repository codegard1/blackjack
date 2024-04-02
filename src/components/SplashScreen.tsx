// React
import React from "react";

// Fluent UI
import {
  Dialog,
  DialogFooter,
  DialogType,
  Dropdown,
  IDropdownOption,
  PrimaryButton,
  ResponsiveMode
} from '@fluentui/react';


import { Player } from "../classes";
import { GameContext, GameDispatchContext, SettingContext, SettingDispatchContext } from '../ctx';
import {
  defaultPlayersDropdownOptions,
  defaultSelectedPlayerKeys
} from "../definitions";
import { GameAction } from "../enums";
import { PlayerKey } from "../types";


export const SplashScreen: React.FC = () => {

  // Context
  const settings = React.useContext(SettingContext);
  const toggleSetting = React.useContext(SettingDispatchContext);
  const gameState = React.useContext(GameContext);
  const gameDispatch = React.useContext(GameDispatchContext);

  // State
  const [selectedPlayers, setSelectedPlayers] = React.useState<PlayerKey[]>(defaultSelectedPlayerKeys);


  const onChangeDropDown = (event: React.FormEvent<HTMLDivElement>, option: IDropdownOption<Player> | undefined, index?: number): void => {
    if (option) {
      const _selectedPlayers = selectedPlayers.slice();
      if (option!.selected && _selectedPlayers.indexOf(option!.key as PlayerKey) === -1) {
        _selectedPlayers.push(option!.key as PlayerKey);
      } else if (!option?.selected && option!.key in selectedPlayers) {
        _selectedPlayers.splice(_selectedPlayers.indexOf(option!.key as PlayerKey), 1);
      }
      setSelectedPlayers(_selectedPlayers);
    }
  }

  function onDismissDialog() {
    console.log('onDismissDialog');
    toggleSetting({ key: 'isSplashScreenVisible', value: false })
  }

  function onClickStartButton() {
    // initiate a new game     
    gameDispatch({ type: GameAction.NewGame, playerKey: selectedPlayers });

    // hide the player selection modal 
    onDismissDialog();
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
        defaultSelectedKeys={defaultSelectedPlayerKeys}
      />
      <DialogFooter>
        <PrimaryButton text="Start" onClick={onClickStartButton} />
      </DialogFooter>
    </Dialog >
  );
}
