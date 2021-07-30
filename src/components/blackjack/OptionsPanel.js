import React from "react";
import * as T from "prop-types";

import {
  ActionButton,
  DirectionalHint,
  Link,
  Panel,
  PanelType,
  Separator,
  Stack,
  Text,
  Toggle,
  TooltipDelay,
  TooltipHost,
} from "@fluentui/react";

/* custom stuff */
import BaseComponent from "../BaseComponent";


import AppActions from "./actions/AppActions";

class OptionsPanel extends BaseComponent {
  constructor(props) {
    super(props);

    this._bind("newDeal", "resetGame");
  }

  static propTypes = {
    isActivityLogVisible: T.bool.isRequired,
    isCardDescVisible: T.bool.isRequired,
    isDealerHandVisible: T.bool.isRequired,
    isDeckVisible: T.bool.isRequired,
    isDrawnVisible: T.bool.isRequired,
    isHandValueVisible: T.bool.isRequired,
    isOptionsPanelVisible: T.bool.isRequired,
    isSelectedVisible: T.bool.isRequired,
    toggleOptionsPanel: T.func.isRequired
  }

  resetGame() {
    AppActions.reset();
    AppActions.newDeck();
    this.props.toggleOptionsPanel();
  }

  newDeal() {
    AppActions.deal();
    this.props.toggleOptionsPanel();
  }


  render() {
    const tooltipCalloutProps = { gapSpace: 0, };

    return (
      <Panel
        id="OptionsPanel"
        isOpen={this.props.isOptionsPanelVisible}
        onDismiss={this.props.toggleOptionsPanel}
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
              aria-describedby="tooltip-ShuffleDeck"
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
            checked={this.props.isDeckVisible}
            label="Show Deck"
            ariaLabel="The deck is visible. Press to hide it."
            onText="On"
            offText="Off"
            onChange={(e, checked) => AppActions.toggleDeckVisibility(checked)}
            value
          />
          <Toggle
            checked={this.props.isDrawnVisible}
            label="Show Drawn"
            ariaLabel="The Drawn cards are visible. Press to hide it."
            onText="On"
            offText="Off"
            onChange={(e, checked) => AppActions.toggleDrawnVisibility(checked)}
          />
          <Toggle
            checked={this.props.isSelectedVisible}
            label="Show Selected"
            ariaLabel="The Selected cards are visible. Press to hide it."
            onText="On"
            offText="Off"
            onChange={(e, checked) => AppActions.toggleSelectedVisibility(checked)}
          />
          <Toggle
            checked={this.props.isDealerHandVisible}
            label="Show Dealer Hand"
            ariaLabel="The dealer's hand is visible. Press to hide it."
            onText="On"
            offText="Off"
            onChange={(e, checked) =>
              AppActions.toggleDealerHandVisibility(checked)}
          />
          <Toggle
            checked={this.props.isHandValueVisible}
            label="Show Hand Value"
            ariaLabel="The hand value display is visible. Press to hide it."
            onText="On"
            offText="Off"
            onChange={(e, checked) => AppActions.toggleHandValueVisibility(checked)}
          />
          <Toggle
            checked={this.props.isCardDescVisible}
            label="Show Card Titles"
            ariaLabel="The card titles are visible. Press to hide them."
            onText="On"
            offText="Off"
            onChange={(e, checked) => AppActions.toggleCardTitleVisibility(checked)}
          />
          <Toggle
            checked={this.props.isActivityLogVisible}
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
      </Panel>
    );
  }
}

export default OptionsPanel;
