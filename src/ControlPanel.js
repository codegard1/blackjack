import React, { Component } from "react";
import * as T from "prop-types";
import { CommandBar } from "office-ui-fabric-react/lib/CommandBar";

export class ControlPanel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      commandBarItems: []
    };
  }

  render() {
    let selectedFlag = this.props.selectedCards.length > 0 ? false : true;
    let gameStatus = this.props.gameStatus;
    let player = this.props.player || undefined;

    const bustedFlag = player.status === "busted";
    const blackjackflag = player.status === "blackjack";
    const gameStatusFlag = gameStatus > 2 || this.props.player.turn === false;

    /**
     * optionsItems: Define buttons in CommandBar
     * @memberof ControlPanel
     * @property {array} - items for the Options menu
     */
    const optionsItems = [
      {
        key: "show-deck",
        name: "Show Deck",
        ariaLabel: "Show Deck",
        iconProps: "",
        disabled: false,
        canCheck: true,
        checked: this.props.isDeckVisible,
        onClick: this.props.toggleDeckVisibility
      },
      {
        key: "show-drawn",
        name: "Show Drawn",
        ariaLabel: "Show Drawn",
        iconProps: "",
        disabled: false,
        canCheck: true,
        checked: this.props.isDrawnVisible,
        onClick: this.props.toggleDrawnVisibility
      },
      {
        key: "show-selected",
        name: "Show Selected",
        ariaLabel: "Show Selected",
        iconProps: "",
        disabled: false,
        canCheck: true,
        checked: this.props.isSelectedVisible,
        onClick: this.props.toggleSelectedVisibility
      }
    ];

    const drawItems = [
      {
        key: "draw",
        name: "Draw",
        ariaLabel: "Draw",
        iconProps: "",
        disabled: false,
        onClick: this.props.draw
      },
      {
        key: "draw-from-bottom-of-deck",
        name: "Draw from Bottom of Deck",
        ariaLabel: "Draw from Bottom of Deck",
        iconProps: "",
        disabled: false,
        onClick: this.props.drawFromBottomOfDeck
      },
      {
        key: "draw-random",
        name: "Draw Random",
        ariaLabel: "Draw Random",
        iconProps: "",
        disabled: false,
        onClick: this.props.drawRandom
      }
    ];

    const putItems = [
      {
        key: "put-on-top-of-deck",
        name: "Put on Top of Deck",
        ariaLabel: "Put on Top of Deck",
        iconProps: "",
        disabled: false,
        onClick: this.props.putOnTopOfDeck
      },
      {
        key: "put-on-bottom-of-deck",
        name: "Put on Bottom of Deck",
        ariaLabel: "Put on Bottom of Deck",
        iconProps: "",
        disabled: false,
        onClick: this.props.putOnBottomOfDeck
      }
    ];

    const defaultItems = [
      {
        key: "deal",
        name: "Deal",
        ariaLabel: "Deal",
        iconProps: { iconName: "StackIndicator" },
        disabled: false,
        onClick: this.props.deal
      },
      {
        key: "shuffle",
        name: "Shuffle",
        ariaLabel: "Shuffle",
        iconProps: { iconName: "Sync" },
        disabled: false,
        onClick: this.props.shuffle
      }
    ];

    const blackJackItems = [
      {
        key: "hit",
        name: "Hit",
        ariaLabel: "Hit",
        iconProps: { iconName: "Add" },
        disabled: gameStatusFlag,
        onClick: this.props.hit
      },
      {
        key: "stay",
        name: "Stay",
        ariaLabel: "Stay",
        iconProps: { iconName: "Forward" },
        disabled: gameStatusFlag,
        onClick: this.props.stay
      },
      {
        key: "reset-game",
        name: "Reset Game",
        ariaLabel: "Reset Game",
        iconProps: { iconName: "Refresh" },
        disabled: false,
        onClick: this.props.resetGame
      }
    ];

    const commandBarDefinition = {
      defaultItems,
      blackJackItems,
      drawMenu: [
        {
          key: "deck-menu",
          name: "Draw",
          ariaLabel: "Draw",
          iconProps: "",
          onClick(ev) {
            ev.preventDefault();
          },
          subMenuProps: {
            items: drawItems,
            isSubMenu: true,
            isBeakVisible: true
          }
        }
      ],
      putMenu: [
        {
          key: "put-menu",
          name: "Put",
          ariaLabel: "Put",
          iconProps: "",
          onClick(ev) {
            ev.preventDefault();
          },
          subMenuProps: {
            items: putItems,
            isSubMenu: true,
            isBeakVisible: true
          }
        }
      ],
      optionsMenu: [
        {
          key: "options-menu",
          name: "Options",
          ariaLabel: "Options",
          iconProps: "",
          onClick(ev) {
            ev.preventDefault();
          },
          subMenuProps: {
            items: optionsItems,
            isSubMenu: true,
            isBeakVisible: true
          }
        }
      ]
    };

    let commandBarItems = this.state.commandBarItems.concat(
      commandBarDefinition.defaultItems
    );
    if (gameStatus > 0) {
      commandBarItems = [].concat(commandBarDefinition.blackJackItems);
    }
    const farItems = commandBarDefinition.optionsMenu;
    const overFlowItems = selectedFlag
      ? []
      : [].concat(commandBarDefinition.putMenu, commandBarDefinition.drawMenu);

    return (
      <div id="ControlPanel">
        {!this.props.hidden &&
          <CommandBar
            isSearchBoxVisible={false}
            items={commandBarItems}
            farItems={farItems}
            overflowItems={overFlowItems}
          />}
      </div>
    );
  }
}

/**
 * Defines the propTypes for ControlPanel
 * @memberof ControlPanel
 */
ControlPanel.propTypes = {
  deal: T.func,
  hit: T.func,
  stay: T.func,
  draw: T.func,
  reset: T.func,
  shuffle: T.func,
  resetGame: T.func,
  putOnBottomOfDeck: T.func,
  putOnTopOfDeck: T.func,
  drawRandom: T.func,
  drawFromBottomOfDeck: T.func,
  toggleDeckVisibility: T.func,
  toggleSelectedVisibility: T.func,
  toggleDrawnVisibility: T.func,
  gameStatus: T.number.isRequired,
  currentPlayer: T.number.isRequired,
  selectedCards: T.array,
  isDeckVisible: T.bool,
  isDrawnVisible: T.bool,
  isSelectedVisible: T.bool,
  turnCount: T.number,
  hidden: T.bool
};

export default ControlPanel;
