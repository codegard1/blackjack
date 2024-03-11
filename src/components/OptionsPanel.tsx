// React
import React from "react";

// Fluent UI
import {
  ActionButton,
  DirectionalHint,
  Link,
  MessageBarType,
  Panel,
  PanelType,
  Separator,
  Stack,
  StackItem,
  Text,
  Toggle,
  TooltipDelay,
  TooltipHost,
} from "@fluentui/react";

// Context
import AppContext from "../classes/AppContext";

export const OptionsPanel: React.FC = () => {

  const {
    isActivityLogVisible,
    isCardDescVisible,
    isDealerHandVisible,
    isDeckVisible,
    isDrawnVisible,
    isHandValueVisible,
    isOptionsPanelVisible,
    isSelectedVisible,
    deckActions,
    gamePlayActions,
    storeActions,
    settingActions,
  } = React.useContext(AppContext);


  const closeOptionsPanel = () => settingActions?.setOptionsPanelVisible(false);

  /**
   * Reset the game from the Options Panel
   */
  const resetGame = () => {
    gamePlayActions?.reset();
    deckActions?.newDeck();
    gamePlayActions?.showMessageBar('Game Reset', MessageBarType.info);
    closeOptionsPanel();
  }

  const newDeal = () => {
    // AppActions.deal();
    closeOptionsPanel();
  }

  const tooltipCalloutProps = { gapSpace: 0, };

  return (
    <Panel
      id="OptionsPanel"
      isOpen={isOptionsPanelVisible}
      onDismiss={closeOptionsPanel}
      type={PanelType.smallFixedFar}
      headerText="Options"
      isLightDismiss
    >
      <Stack verticalAlign="start" tokens={{ childrenGap: 5 }}>

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
            onClick={newDeal}
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
            onClick={resetGame}
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
            onClick={deckActions?.shuffle}
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
            onClick={storeActions?.clearStores}
            ariaLabel="Clear Stores"
            aria-describedby="tooltip-ClearStores"
          >
            Clear Stores
          </ActionButton>
        </TooltipHost>

        <Separator />

        <Toggle
          checked={isDeckVisible}
          label="Show Deck"
          ariaLabel="The deck is visible. Press to hide it."
          onText="On"
          offText="Off"
          onChange={(e, checked) => settingActions?.setDeckVisible(checked ? checked : true)}
        />
        <Toggle
          checked={isDrawnVisible}
          label="Show Drawn"
          ariaLabel="The Drawn cards are visible. Press to hide it."
          onText="On"
          offText="Off"
          onChange={(e, checked) => settingActions?.setDrawnVisible(checked ? checked : false)}
        />
        <Toggle
          checked={isSelectedVisible}
          label="Show Selected"
          ariaLabel="The Selected cards are visible. Press to hide it."
          onText="On"
          offText="Off"
          onChange={(e, checked) => settingActions?.setSelectedVisible(checked ? checked : false)}
        />
        <Toggle
          checked={isDealerHandVisible}
          label="Show Dealer Hand"
          ariaLabel="The dealer's hand is visible. Press to hide it."
          onText="On"
          offText="Off"
          onChange={(e, checked) =>
            settingActions?.setDealerHandVisible(checked ? checked : false)}
        />
        <Toggle
          checked={isHandValueVisible}
          label="Show Hand Value"
          ariaLabel="The hand value display is visible. Press to hide it."
          onText="On"
          offText="Off"
          onChange={(e, checked) => settingActions?.setHandValueVisible(checked ? checked : false)}
        />
        <Toggle
          checked={isCardDescVisible}
          label="Show Card Titles"
          ariaLabel="The card titles are visible. Press to hide them."
          onText="On"
          offText="Off"
          onChange={(e, checked) => settingActions?.setCardTitleVisible(checked ? checked : false)}
        />
        <Toggle
          checked={isActivityLogVisible}
          label="Show Activity Log"
          ariaLabel="The Activity Log visible. Press to hide it."
          onText="On"
          offText="Off"
          onChange={(e, checked) => settingActions?.setActivityLogVisible(checked ? checked : false)}
        />


        <Separator />

        <StackItem>
          <Text variant="medium">
            <strong>Chris's Blackjack</strong>
          </Text>
          <Text variant="smallPlus" nowrap block>
            &copy;2024 <Link href="https://github.com/codegard1/blackjack">Chris Odegard</Link>
            <br />
            Made in Brooklyn with <Link href="https://reactjs.org/">React</Link> and <Link href="https://developer.microsoft.com/en-us/fluentui">Fluent UI</Link>.
          </Text>
        </StackItem>

      </Stack>
    </Panel>
  );
}
