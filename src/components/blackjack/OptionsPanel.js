import React from "react";
// import * as T from "prop-types";
import {
  ActionButton,
  Link,
  Panel,
  PanelType,
  Separator,
  Stack,
  Toggle,
  Text,
  TooltipHost,
  TooltipDelay,
  DirectionalHint,
} from "@fluentui/react";

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
    const tooltipCalloutProps = { gapSpace: 0, };

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

          <TooltipHost
            content="Start a new round with the selected players"
            id="tooltip-NewDeal"
            calloutProps={tooltipCalloutProps}
            directionalHint={DirectionalHint.bottomLeftEdge}
            delay={TooltipDelay.long}
          >
            <ActionButton
              iconProps={{ iconName: "StackIndicator" }}
              disabled={false}
              checked={false}
              onClick={this.newDeal}
              ariaLabel="Deal"
              aria-describedby="tooltip-NewDeal"
            >
              Deal
          </ActionButton>
          </TooltipHost>

          <TooltipHost
            content="Reset the game with initial parameters"
            id=""
            calloutProps={tooltipCalloutProps}
            directionalHint={DirectionalHint.bottomLeftEdge}
            delay={TooltipDelay.long}
          >
            <ActionButton
              iconProps={{ iconName: "Refresh" }}
              disabled={false}
              checked={false}
              onClick={this.resetGame}
              ariaLabel="Reset Game"
              aria-describedby="tooltip-ResetGame"
            >
              Reset Game
          </ActionButton>
          </TooltipHost>

          <TooltipHost
            content="Reset the game with initial parameters"
            id="tooltip-ShuffleDeck"
            calloutProps={tooltipCalloutProps}
            directionalHint={DirectionalHint.bottomLeftEdge}
            delay={TooltipDelay.long}
          >
            <ActionButton
              iconProps={{ iconName: "Sync" }}
              disabled={false}
              checked={false}
              onClick={AppActions.shuffle}
              ariaLabel="Shuffle Deck"
              aria-aria-describedby="tooltip-ShuffleDeck"
            >
              Shuffle Deck
          </ActionButton>
          </TooltipHost>

          <TooltipHost
            content="Clear application data stored locally in the browser"
            id="tooltip-ClearStores"
            calloutProps={tooltipCalloutProps}
            directionalHint={DirectionalHint.bottomLeftEdge}
            delay={TooltipDelay.zero}
          >
            <ActionButton
              iconProps={{ iconName: "Trash" }}
              disabled={false}
              checked={false}
              onClick={AppActions.clearStores}
              ariaLabel="Clear Stores"
              aria-describedby="tooltip-ClearStores"
            >
              Clear Stores
          </ActionButton>
          </TooltipHost>

          <Separator tokens={{ chldrenGap: 12 }} />

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


          <Separator tokens={{ chldrenGap: 12 }} />

          <Stack.Item>
            <Text variant="medium">
              <strong>Chris's Blackjack</strong>
            </Text>
            <Text variant="smallPlus" nowrap block>
              &copy;2021 <Link href="https://github.com/codegard1/blackjack">Chris Odegard</Link>
              <br />
              Made in Brooklyn with <Link href="https://reactjs.org/">React</Link> and <Link href="https://developer.microsoft.com/en-us/fluentui">Fluent UI</Link>.
            </Text>
          </Stack.Item>

        </Stack>
      </Panel >
    );
  }
}

export default OptionsPanel;
