import React from "react";
import * as T from "prop-types";
import {
  Dropdown,
  Dialog,
  DialogFooter,
  DialogType,
  PrimaryButton,
} from '@fluentui/react';


// import AppActions from "./actions/AppActions";

import AppContext from "../classes/AppContext";

import {
  defaultPlayersDropdownOptions,
  defaultSelectedPlayerKeys
} from "../definitions";

export interface ISplashScreenProps {
  players: any[];
  hidden: Boolean;
  toggleHide: () => void;
  onHide: () => void;
}

export const SplashScreen: React.FC<ISplashScreenProps> = (props) => {

  // Context
  const {
    deckActions,
    gamePlayActions,
    gameStatus
  } = React.useContext(AppContext);

  // State
  const [selectedPlayers, setSelectedPlayers] = React.useState<any>(defaultSelectedPlayerKeys);



  const onChangeDropDown = (e, o, i) => {
    const _selectedPlayers = selectedPlayers.slice();
    if (o.selected && _selectedPlayers.indexOf(o.key) === -1) {
      _selectedPlayers.push(o.key);
    } else if (!o.selected && _selectedPlayers.indexOf(o.key) !== -1) {
      _selectedPlayers.splice(_selectedPlayers.indexOf(o.key), 1);
    }
    setSelectedPlayers(_selectedPlayers);
  }

  const onClickStartButton = (e) => {
    const { players } = props;

    // get the complete player object for AppActions that don't use playerKey yet
    let pList = selectedPlayers.map(key => players[key]);

    // initiate a new game 
    gamePlayActions.newGame(pList);

    // hide the player selection modal 
    props.onHide();
  }

  return (
    <Dialog
      hidden={props.hidden}
      dialogContentProps={{
        type: DialogType.normal,
        title: 'Blackjack',
        subText: 'This is the splash screen',
      }}
      modalProps={{
        isBlocking: true,
        styles: { main: { maxWidth: 450, top: 125 } },
        isDraggable: true,
        labelId: 'dialogLabel',
        subTextId: 'subTextLabel',
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
        styles={{ width: 200 }}
      />
      <DialogFooter>
        <PrimaryButton text="Start" onClick={onClickStartButton} />
      </DialogFooter>
    </Dialog>
  );
}
