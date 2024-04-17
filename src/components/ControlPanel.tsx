// React
import React from "react";

// Fluent UI
import { CommandBar, ICommandBarItemProps, MessageBarType, nullRender } from "@fluentui/react";

// Local Resources
import { useGameContext, useSettingContext } from "../context";
import { GameAction } from "../enums";
import { IControlPanelProps } from "../interfaces";

// Component
export const ControlPanel: React.FC<IControlPanelProps> = (props) => {

  // Props
  const {
    playerStatusFlag,
    playerKey,
    selectedFlag,
    hidden,
    isDeckCalloutVisible,
    showDeckCallout,
  } = props;

  // State from context
  const { gameState, gameDispatch } = useGameContext();
  const { settings, toggleSetting } = useSettingContext();
  const { gameStatus, minimumBet } = gameState;
  const playerStore = gameState.playerStore.state;

  // Computed properties
  const currentPlayerKey = playerStore.currentPlayerKey;
  const player = playerStore.players[props.playerKey];
  const npcFlag = player.isNPC;
  const isBtnDisabled = gameStatus > 2 || currentPlayerKey !== playerKey;

  /* selectedFlag is true when the player has selected cards in his hand */
  /* Flag used by put / draw menu items */
  // let selectedCards = selectedFlag ? DeckStore.getSelected(playerKey) : [];
  /* when gameStatusFlag is TRUE, most members of blackJackItems are disabled */

  const _hit = () => {
    toggleSetting({ key: 'isMessageBarVisible', value: true });
    gameDispatch({ type: GameAction.Draw, playerKey, numberOfCards: 1, deckSide: 'top' });
  }

  const drawItems = [
    {
      key: "draw",
      name: "Draw",
      ariaLabel: "Draw",
      iconProps: { iconName: "HandsFree" },
      disabled: isBtnDisabled,
      onClick: () => gameDispatch({ type: GameAction.Draw, playerKey, deckSide: 'top', numberOfCards: 1 }),
    },
    {
      key: "draw-from-bottom-of-deck",
      name: "Draw from Bottom of Deck",
      ariaLabel: "Draw from Bottom of Deck",
      iconProps: { iconName: "HandsFree" },
      disabled: isBtnDisabled,
      onClick: () => gameDispatch({ type: GameAction.Draw, playerKey, deckSide: 'bottom', numberOfCards: 1 }),
    },
    {
      key: "draw-random",
      name: "Draw Random",
      ariaLabel: "Draw Random",
      iconProps: { iconName: "HandsFree" },
      disabled: isBtnDisabled,
      onClick: () => gameDispatch({ type: GameAction.Draw, playerKey, deckSide: 'random', numberOfCards: 1 }),
    },
  ];

  let blackJackItems: ICommandBarItemProps[] = [
    {
      key: "hit",
      name: "Hit",
      ariaLabel: "Hit",
      iconProps: { iconName: "Add" },
      disabled: isBtnDisabled,
      onClick: _hit,
    },
    {
      key: "bet",
      name: `Bet $${minimumBet}`,
      ariaLabel: `Bet $${minimumBet}`,
      iconProps: { iconName: "Up" },
      disabled: isBtnDisabled,
      onClick: () => gameDispatch({ type: GameAction.SetMinimumBet, playerKey, minimumBet }),
    },
    {
      key: "stay",
      name: "Stay",
      ariaLabel: "Stay",
      iconProps: { iconName: "Forward" },
      disabled: isBtnDisabled,
      onClick: () => gameDispatch({ type: GameAction.Stay, playerKey }),
    }
  ];

  const farItems: ICommandBarItemProps[] = npcFlag
    ? []
    : [
      {
        key: "new-round",
        name: "Deal",
        ariaLabel: "Deal",
        iconProps: { iconName: "Refresh" },
        disabled: gameStatus > 0,
        onClick: () => {
          gameDispatch({ type: GameAction.NewRound });
          toggleSetting({ key: 'isMessageBarVisible', value: true });
          gameDispatch({
            type: GameAction.ShowMessageBar,
            messageBarDefinition: { text: "New Round", type: MessageBarType.info, isMultiLine: false }
          })
        }
      }
    ];

  const overFlowItems: ICommandBarItemProps[] = [...drawItems];

  return props.hidden ? nullRender() :
    <CommandBar
      items={blackJackItems}
      farItems={farItems}
      overflowItems={overFlowItems}
      className="player-controlpanel"
    />
}
