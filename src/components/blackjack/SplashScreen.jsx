import React from "react";
import {
  DefaultButton,
  Dropdown,
  DefaultEffects,
  Dialog,
  DialogFooter,
  DialogType,
  Icon,
  PrimaryButton,
  Spinner,
  SpinnerSize,
  Stack,
} from '@fluentui/react';
import { MotionAnimations } from '@fluentui/theme';

/* custom stuff */
import BaseComponent from "../BaseComponent";

/* flux */
import AppActions from "./actions/AppActions";

import {
  defaultPlayersObj,
  defaultPlayersDropdownOptions,
  defaultSelectedPlayerKeys
} from "./definitions";

export default class SplashScreen extends BaseComponent {
  constructor() {
    super();
    this.state = {
      selectedPlayers: defaultSelectedPlayerKeys,
      players: defaultPlayersObj,
    }

    this._bind("onChangeDropDown", "onClickStartButton",);
  }

  onChangeDropDown(e, o, i) {
    const selectedPlayers = this.state.selectedPlayers;
    if (o.selected && selectedPlayers.indexOf(o.key) === -1) {
      selectedPlayers.push(o.key);
    } else if (!o.selected && selectedPlayers.indexOf(o.key) !== -1) {
      selectedPlayers.splice(selectedPlayers.indexOf(o.key), 1);
    }
    this.setState({ selectedPlayers });
  }

  onClickStartButton(e) {
    const { players, selectedPlayers } = this.state;

    // get the complete player object for AppActions that don't use playerKey yet
    let pList = selectedPlayers.map(key => players[key]);

    // initiate a new game 
    AppActions.newGame(pList);

    // hide the player selection modal 
    this.props.toggleHideDialog();
  }

  render() {
    return (
      <Dialog
        hidden={this.props.hidden}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Blackjack',
          subText: 'This is the splash screen',
        }}
        modalProps={{
          isBlocking: true,
          styles: { main: { maxWidth: 450, top: 75 } },
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
          onChange={this.onChangeDropDown}
          options={defaultPlayersDropdownOptions}
          styles={{ width: 200 }}
        />
        <DialogFooter>
          <PrimaryButton text="Start" onClick={this.onClickStartButton} />
        </DialogFooter>
      </Dialog>
    )
  }
}
