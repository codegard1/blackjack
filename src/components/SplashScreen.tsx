// React
import React from "react";

// Fluent UI
import {
  Dropdown,
  Dialog,
  DialogFooter,
  DialogType,
  PrimaryButton,
  IDropdownOption,
} from '@fluentui/react';

import AppContext from "../classes/AppContext";

import {
  defaultPlayers,
  defaultPlayersDropdownOptions,
  defaultSelectedPlayerKeys
} from "../definitions";
import { PlayerKey } from "../types";
import { Player } from "../classes";

export const SplashScreen: React.FC = () => {

  // Context
  const {
    deckActions,
    gamePlayActions,
    gameStatus,
    settingStore,
  } = React.useContext(AppContext);

  // State
  const [selectedPlayers, setSelectedPlayers] = React.useState<any>(defaultSelectedPlayerKeys);


  const onChangeDropDown = (event: React.FormEvent<HTMLDivElement>, option: IDropdownOption<Player> | undefined, index?: number): void => {
    if (option) {
      const _selectedPlayers = selectedPlayers.slice();
      if (option!.selected && _selectedPlayers.indexOf(option!.key) === -1) {
        _selectedPlayers.push(option!.key);
      } else if (!option?.selected && option!.key in selectedPlayers) {
        _selectedPlayers.splice(_selectedPlayers.indexOf(option!.key), 1);
      }
      setSelectedPlayers(_selectedPlayers);
    }
  }

  const onClickStartButton = () => {
    console.log('SplashScreen.onClickStartButton');
    //   const { players } = props;

    //   // get the complete player object for AppActions that don't use playerKey yet
    //   // let pList = selectedPlayers.map(key => players[key]);

    //   // initiate a new game 
    //   // gamePlayActions.newGame(pList);

    //   // hide the player selection modal 
    //   props.onHide();
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
      />
      <DialogFooter>
        <PrimaryButton text="Start" onClick={onClickStartButton} />
      </DialogFooter>
    </Dialog>
  );
}
