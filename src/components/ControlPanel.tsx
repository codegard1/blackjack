// React
import React from "react";

// Fluent UI
import { CommandBar, ICommandBarItemProps, MessageBarType, nullRender } from "@fluentui/react";

// Local Resources
import { useGameContext } from "../context";
import { GameAction } from "../enums";
import { IControlPanelProps } from "../interfaces";

// Component
export const ControlPanel: React.FC<IControlPanelProps> = (props) => {

  // State from context
  const { gameState, gameDispatch } = useGameContext();
  const { gameStatusFlag, gameStatus, minimumBet } = gameState;

  const {
    playerStatusFlag,
    playerKey,
    player
  } = props;
  const npcFlag = player.isNPC;

  /* selectedFlag is true when the player has selected cards in his hand */
  // let selectedFlag = this.props.selectedFlag;
  /* Flag used by put / draw menu items */
  // let selectedCards = selectedFlag
  // ? DeckStore.getSelected(playerKey)
  //   : [];
  /* when gameStatusFlag is TRUE, most members of blackJackItems are disabled */

  // const drawItems = [
  //   {
  //     key: "draw",
  //     name: "Draw",
  //     ariaLabel: "Draw",
  //     iconProps: "",
  //     disabled: false,
  //     onClick: AppActions.draw
  //   },
  //   {
  //     key: "draw-from-bottom-of-deck",
  //     name: "Draw from Bottom of Deck",
  //     ariaLabel: "Draw from Bottom of Deck",
  //     iconProps: "",
  //     disabled: false,
  //     onClick: AppActions.drawFromBottomOfDeck
  //   },
  //   {
  //     key: "draw-random",
  //     name: "Draw Random",
  //     ariaLabel: "Draw Random",
  //     iconProps: "",
  //     disabled: false,
  //     onClick: AppActions.drawRandom
  //   }
  // ];
  // const putItems = [
  //   {
  //     key: "put-on-top-of-deck",
  //     name: "Put on Top of Deck",
  //     ariaLabel: "Put on Top of Deck",
  //     iconProps: "",
  //     disabled: false,
  //     onClick: ev => {
  //       ev.preventDefault();
  //       AppActions.putOnTopOfDeck(playerKey, selectedCards);
  // AppActions.removeSelectedFromPlayerHand(playerKey,selectedCards);
  //     }
  //   },
  //   {
  //     key: "put-on-bottom-of-deck",
  //     name: "Put on Bottom of Deck",
  //     ariaLabel: "Put on Bottom of Deck",
  //     iconProps: "",
  //     disabled: false,
  //     onClick: cards => {
  //       AppActions.putOnBottomOfDeck(cards);
  //       AppActions.removeSelectedFromPlayerHand(playerKey,cards);
  //     }
  //   }
  // ];
  let blackJackItems: ICommandBarItemProps[] = [
    {
      key: "hit",
      name: "Hit",
      ariaLabel: "Hit",
      iconProps: { iconName: "Add" },
      disabled: gameStatusFlag || playerStatusFlag,
      onClick: (ev: any) => {
        ev.preventDefault();
        gameDispatch({ type: GameAction.Draw, playerKey, numberOfCards: 1, deckSide: 'top' });
      }
    },
    // {
    //   key: "bet",
    //   name: `Bet $${this.props.minimumBet}`,
    //   ariaLabel: `Bet $${this.props.minimumBet}`,
    //   iconProps: { iconName: "Up" },
    //   disabled: (gameStatusFlag || playerStatusFlag),
    //   onClick: (ev, target, playerIndex, amount) => {
    //     ev.preventDefault();
    //     AppActions.bet(playerKey, amount);
    //   }
    // },
    {
      key: "stay",
      name: "Stay",
      ariaLabel: "Stay",
      iconProps: { iconName: "Forward" },
      disabled: gameStatusFlag || playerStatusFlag,
      onClick: () => gameDispatch({ type: GameAction.Stay }),
    }
  ];

  /* menu items for drawing cards */
  // const drawMenu = [
  //   {
  //     key: "deck-menu",
  //     name: "Draw",
  //     ariaLabel: "Draw",
  //     iconProps: "",
  //     onClick(ev) {
  //       ev.preventDefault();
  //     },
  //     subMenuProps: {
  //       items: drawItems,
  //       isSubMenu: true,
  //       isBeakVisible: true
  //     }
  //   }
  // ];

  /* menu items for putting cards */
  // const putMenu = [
  //   {
  //     key: "put-menu",
  //     name: "Put",
  //     ariaLabel: "Put",
  //     iconProps: "",
  //     onClick(ev) {
  //       ev.preventDefault();
  //     },
  //     subMenuProps: {
  //       items: putItems,
  //       isSubMenu: true,
  //       isBeakVisible: true
  //     }
  //   }
  // ];

  const farItems: ICommandBarItemProps[] = npcFlag
    ? []
    : [
      {
        key: "new-round",
        name: "Deal",
        ariaLabel: "Deal",
        iconProps: { iconName: "Refresh" },
        disabled: gameStatusFlag,
        onClick: () => {
          gameDispatch({ type: GameAction.ResetGame });
          gameDispatch({ type: GameAction.NewRound });
          gameDispatch({
            type: GameAction.ShowMessageBar,
            messageBarDefinition: { text: "New Round", type: MessageBarType.info, isMultiLine: false }
          })
        }
      }
    ];

  // const overFlowItems = selectedFlag ? [].concat(putMenu, drawMenu) : [];
  const overFlowItems: ICommandBarItemProps[] = [];

  return props.hidden ? nullRender() :
    <CommandBar
      items={blackJackItems}
      farItems={farItems}
      overflowItems={overFlowItems}
      className="player-controlpanel"
    />
}

