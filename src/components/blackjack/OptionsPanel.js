import React from "react";
import * as T from "prop-types";
import { Stack, Panel, PanelType, Toggle, CommandButton, Dropdown, DropdownMenuItemType, TextField, DefaultButton } from "@fluentui/react";

/* custom stuff */
import BaseComponent from "../BaseComponent";
import { defaults, defaultPlayers, defaultSelectedPlayerKey } from "./definitions";

/* Flux */
import AppActions from "./actions/AppActions";
import ControlPanelStore from "./stores/ControlPanelStore";

class OptionsPanel extends BaseComponent {
  constructor(props) {
    super(props);

    // get default state from the Store
    this.state = ControlPanelStore.getState();

    this._bind("newDeal", "onChangeControlPanel", "resetGame", "onClickNewPlayerSaveButton", "makePlayerSelectDropdownOptions");
  }

  componentDidMount() {
    /* add change listener */
    ControlPanelStore.addChangeListener(this.onChangeControlPanel);
  }

  componentWillUnmount() {
    /* remove change listener */
    ControlPanelStore.removeChangeListener(this.onChangeControlPanel);
  }

  resetGame() {
    AppActions.reset();
    AppActions.newDeck();
    AppActions.showMessageBar("Game Reset");
    AppActions.hideOptionsPanel();
  }

  newDeal() {
    AppActions.deal();
    AppActions.hideOptionsPanel();
  }

  // Update the Component State from the Store
  onChangeControlPanel() {
    const newState = ControlPanelStore.getState();
    this.setState({ ...newState });
  }

  // save new player
  onClickNewPlayerSaveButton() {
    const newPlayerName = this.state.newPlayerFieldValue;
    AppActions.createNewPlayer(newPlayerName);
    this.setState({
      newPlayerFieldValue: "",
      isNewPlayerSaveButtonDisabled: true
    });
  }

  makePlayerSelectDropdownOptions() {
    // define options array with initial header
    let options = [
      { key: 'defaultsHeader', text: 'Default', itemType: DropdownMenuItemType.Header }
    ];

    // add default players to the array
    this.state.players.forEach((v, i, a) => {
      if (defaultPlayers.find(el => el.id === v.id)) {
        options.push({ key: v.title.toLowerCase(), text: v.title });
      }
    });

    // add a divider and second header
    options.push(
      { key: 'divider_1', text: '-', itemType: DropdownMenuItemType.Divider },
      { key: 'customsHeader', text: 'Custom', itemType: DropdownMenuItemType.Header }
    );


    // add custom players to the array
    this.state.players.forEach((v, i, a) => {
      if (!defaultPlayers.find(el => el.id === v.id)) {
        options.push({ key: v.title.toLowerCase(), text: v.title });
      }
    });

    return options;
  }

  render() {

    return (
      <Panel
        id="OptionsPanel"
        isOpen={this.state.isOptionsPanelVisible}
        onDismiss={AppActions.hideOptionsPanel}
        type={PanelType.smallFixedFar}
        headerText="Options"
        isLightDismiss
      >
        <Stack vertical verticalAlign="start" tokens={{ childrenGap: 5 }}>
          <CommandButton
            iconProps={{ iconName: "StackIndicator" }}
            disabled={false}
            checked={false}
            onClick={this.newDeal}
          >
            Deal
          </CommandButton>

          <CommandButton
            iconProps={{ iconName: "Refresh" }}
            disabled={false}
            checked={false}
            onClick={this.resetGame}
          >
            Reset Game
          </CommandButton>

          <CommandButton
            iconProps={{ iconName: "Sync" }}
            disabled={false}
            checked={false}
            onClick={AppActions.shuffle}
          >
            Shuffle Deck
          </CommandButton>

          <Toggle
            checked={this.state.isDeckVisible}
            label="Show Deck"
            ariaLabel="The deck is visible. Pres to hide it."
            onText="On"
            offText="Off"
            onChange={(e, checked) => AppActions.toggleDeckVisibility(checked)}
            value
          />
          <Toggle
            checked={this.state.isDrawnVisible}
            label="Show Drawn"
            ariaLabel="The Drawn cards are visible. Pres to hide it."
            onText="On"
            offText="Off"
            onChange={(e, checked) => AppActions.toggleDrawnVisibility(checked)}
          />
          <Toggle
            checked={this.state.isSelectedVisible}
            label="Show Selected"
            ariaLabel="The Selected cards are visible. Pres to hide it."
            onText="On"
            offText="Off"
            onChange={(e, checked) => AppActions.toggleSelectedVisibility(checked)}
          />
          <Toggle
            checked={this.state.isDealerHandVisible}
            label="Show Dealer Hand"
            ariaLabel="The dealer's hand is visible. Press to hide it."
            onText="On"
            offText="Off"
            onChange={(e, checked) =>
              AppActions.toggleDealerHandVisibility(checked)}
          />
          <Toggle
            checked={this.state.isHandValueVisible}
            label="Show Hand Value"
            ariaLabel="The hand value display is visible. Press to hide it."
            onText="On"
            offText="Off"
            onChange={(e, checked) => AppActions.toggleHandValueVisibility(checked)}
          />
          <Toggle
            checked={this.state.isCardDescVisible}
            label="Show Card Titles"
            ariaLabel="The card titles are visible. Press to hide them."
            onText="On"
            offText="Off"
            onChange={(e, checked) => AppActions.toggleCardTitleVisibility(checked)}
          />

          <Dropdown
            placeholder="Select"
            label="Select existing user"
            options={this.makePlayerSelectDropdownOptions()}
            selectedKey={this.state.selectedPlayerKey}
            onChange={(e, option) => AppActions.selectPlayer(option.key)}
            styles={{ dropdown: { width: 300 } }}
          />

          {/* <Stack tokens={{ padding: 10, childrenGap: 10 }}>
            <Stack.Item shrink>
              <TextField
                label="Create new player"
                ariaLabel="Create new player"
                text={this.state.newPlayerFieldValue}
                onChange={(e, newValue) => this.setState({ newPlayerFieldValue: newValue })}
              />
            </Stack.Item>
            <Stack.Item shrink>
              <DefaultButton
                text="Save"
                disabled={this.state.isNewPlayerSaveButtonDisabled}
                onClick={e => this.onClickNewPlayerSaveButton()}
              />
            </Stack.Item>
          </Stack> */}

        </Stack>
      </Panel>
    );
  }
}

export default OptionsPanel;
