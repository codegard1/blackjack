import React from "react";
// import * as T from "prop-types";
import { Stack, Panel, PanelType, Toggle, CommandButton } from "@fluentui/react";

/* custom stuff */
import BaseComponent from "../BaseComponent";

/* Flux */
import AppActions from "./actions/AppActions";
import ControlPanelStore from "./stores/ControlPanelStore";

class OptionsPanel extends BaseComponent {
  constructor(props) {
    super(props);

    // get default state from the Store
    this.state = ControlPanelStore.getState();

    this._bind("newDeal", "resetGame");
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
        </Stack>

        <Stack vertical verticalAlign="start" tokens={{ childrenGap: 2 }}>
          <Toggle
            checked={this.state.isDeckVisible}
            label="Show Deck"
            ariaLabel="The deck is visible. Press to hide it."
            onText="On"
            offText="Off"
            onChange={(e, checked) => AppActions.toggleDeckVisibility(checked)}
            value
          />
          <Toggle
            checked={this.state.isDrawnVisible}
            label="Show Drawn"
            ariaLabel="The Drawn cards are visible. Press to hide it."
            onText="On"
            offText="Off"
            onChange={(e, checked) => AppActions.toggleDrawnVisibility(checked)}
          />
          <Toggle
            checked={this.state.isSelectedVisible}
            label="Show Selected"
            ariaLabel="The Selected cards are visible. Press to hide it."
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
          <Toggle
            checked={this.state.isActivityLogVisible}
            label="Show Activity Log"
            ariaLabel="The Activity Log visible. Press to hide it."
            onText="On"
            offText="Off"
            onChange={(e, checked) => AppActions.toggleActivityLogVisibility(checked)}
          />
        </Stack>

        <Stack vertical verticalAlign="start" tokens={{ childrenGap: 25 }}>
          <CommandButton
            iconProps={{ iconName: "Trash" }}
            disabled={false}
            checked={false}
            onClick={AppActions.clearStores}
          >
            Clear Stores
          </CommandButton>

        </Stack>
      </Panel>
    );
  }
}

export default OptionsPanel;
