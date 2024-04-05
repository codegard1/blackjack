// React
import React from "react";

// Fluent UI
import {
  ActionButton, DirectionalHint, Link, MessageBarType, Panel, PanelType, Separator, Stack, StackItem, Text, Toggle, TooltipDelay, TooltipHost,
} from "@fluentui/react";

// Context
import { DeckDispatchContext, useGameContext, useSettingContext } from "../context";
import { DeckAction, GameAction } from "../enums";
import { clearStores } from "../functions";

export const OptionsPanel: React.FC = () => {

  // Context
  const { settings, toggleSetting } = useSettingContext(),
    deckDispatch = React.useContext(DeckDispatchContext),
    { gameState, gameDispatch } = useGameContext();
  const playerStore = gameState.playerStore;

  const closeOptionsPanel = () => {
    toggleSetting({ key: "isOptionsPanelVisible", value: false });
  }

  /**
   * Reset the game from the Options Panel
   */
  const resetGame = () => {
    deckDispatch({ type: DeckAction.Reset });
    gameDispatch({ type: GameAction.ResetGame });
    gameDispatch({ type: GameAction.ShowMessageBar, messageBarDefinition: { text: 'Game Reset', type: MessageBarType.info, isMultiLine: false } });
    closeOptionsPanel();
  }

  const newDeal = () => {
    playerStore.all.forEach(p => deckDispatch({ type: DeckAction.Draw, playerKey: p.key }));
    closeOptionsPanel();
  }

  const shuffle = () => {
    deckDispatch({ type: DeckAction.Shuffle });
    closeOptionsPanel();
  }

  const tooltipCalloutProps = { gapSpace: 0, };

  return (
    <Panel
      id="OptionsPanel"
      isOpen={settings.isOptionsPanelVisible}
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
            onClick={shuffle}
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
            onClick={() => clearStores()}
            ariaLabel="Clear Stores"
            aria-describedby="tooltip-ClearStores"
          >
            Clear Stores
          </ActionButton>
        </TooltipHost>

        <Separator />

        <Toggle
          checked={settings.isDeckVisible}
          label="Show Deck"
          ariaLabel="The deck is visible. Press to hide it."
          onText="On"
          offText="Off"
          onChange={(e, checked) => {
            toggleSetting({ key: "isDeckVisible", value: !!checked });
          }}
        />
        <Toggle
          checked={settings.isDrawnVisible}
          label="Show Drawn"
          ariaLabel="The Drawn cards are visible. Press to hide it."
          onText="On"
          offText="Off"
          onChange={(e, checked) => {
            toggleSetting({ key: "isDrawnVisible", value: !!checked });
          }}
        />
        <Toggle
          checked={settings.isSelectedVisible}
          label="Show Selected"
          ariaLabel="The Selected cards are visible. Press to hide it."
          onText="On"
          offText="Off"
          onChange={(e, checked) => {
            toggleSetting({ key: "isSelectedVisible", value: !!checked });
          }}
        />
        <Toggle
          checked={settings.isDealerHandVisible}
          label="Show Dealer Hand"
          ariaLabel="The dealer's hand is visible. Press to hide it."
          onText="On"
          offText="Off"
          onChange={(e, checked) => {
            toggleSetting({ key: "isDealerHandVisible", value: !!checked });
          }}
        />
        <Toggle
          checked={settings.isHandValueVisible}
          label="Show Hand Value"
          ariaLabel="The hand value display is visible. Press to hide it."
          onText="On"
          offText="Off"
          onChange={(e, checked) => {
            toggleSetting({ key: 'isHandValueVisible', value: !!checked });
          }}
        />
        <Toggle
          checked={settings.isCardTitleVisible}
          label="Show Card Titles"
          ariaLabel="The card titles are visible. Press to hide them."
          onText="On"
          offText="Off"
          onChange={(e, checked) => {
            toggleSetting({ key: "isCardTitleVisible", value: !!checked });
          }}
        />
        <Toggle
          checked={settings.isActivityLogVisible}
          label="Show Activity Log"
          ariaLabel="The Activity Log visible. Press to hide it."
          onText="On"
          offText="Off"
          onChange={(e, checked) => {
            toggleSetting({ key: "isActivityLogVisible", value: !!checked });
          }}
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
