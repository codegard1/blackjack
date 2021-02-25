import React from "react";
import * as T from "prop-types";
import {
  Dropdown,
  Dialog,
  DialogFooter,
  DialogType,
  PrimaryButton,
} from '@fluentui/react';

/* custom stuff */
import BaseComponent from "../BaseComponent";

/* flux */
import AppActions from "./actions/AppActions";

import {
  defaultPlayersDropdownOptions,
  defaultSelectedPlayerKeys
} from "./definitions";

export default class SplashScreen extends BaseComponent {
  constructor() {
    super();
    this.state = {
      selectedPlayers: defaultSelectedPlayerKeys,
    }

    this._bind("onChangeDropDown", "onClickStartButton",);
  }

  static propTypes = {
    players: T.object.isRequired,
    hidden: T.bool.isRequired,
    toggleHide: T.func.isRequired,
    onHide: T.func.isRequired,
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
    const { players } = this.props;
    const { selectedPlayers } = this.state;

    // get the complete player object for AppActions that don't use playerKey yet
    let pList = selectedPlayers.map(key => players[key]);

    // initiate a new game 
    AppActions.newGame(pList);

    // hide the player selection modal 
    this.props.onHide();
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
