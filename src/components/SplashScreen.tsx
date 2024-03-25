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
} from '@fluentui/react';

import AppContext from "../classes/AppContext";

import { Player } from "../classes";
import {
  defaultPlayersDropdownOptions,
  defaultSelectedPlayerKeys
} from "../definitions";
import { PlayerKey } from "../types";

export const SplashScreen: React.FC = () => {

  // Context
  const {
    gameStore,
    settingStore,
    playerStore,
  } = React.useContext(AppContext);

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

  const onClickStartButton = () => {
    // get the complete player object for AppActions that don't use playerKey yet
    // let pList = selectedPlayers.map(key => players[key]);

    // initiate a new game 
    // gameStore.newGame(pList);

    // hide the player selection modal 
    settingStore.setSplashScreenVisible(false);
  }

  return (
    <Dialog
      hidden={!settingStore.isSplashScreenVisible}
      dialogContentProps={{
        type: DialogType.normal,
        title: 'Blackjack',
        subText: 'This is the splash screen',
      }}
      modalProps={{
        isBlocking: true,
        styles: { main: { maxWidth: 450, top: 125 } },
        isDarkOverlay: true,
        topOffsetFixed: true,

      }}
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
    </Dialog>
  );
}
