import React, { Component } from "react";
import * as T from "prop-types";
import { CommandBar } from "office-ui-fabric-react/lib/CommandBar";

/** Contains buttons that manipulate state in Table
 * @namespace ControlPanel
 * @memberof App.Components
 * @prop {function} putOnBottomOfDeck   - move selected cards to the bottom of the deck (in state)
 * @prop {function} putOnTopOfDeck  - move selected cards to the top of the deck (in state)
 * @prop {function} drawRandom  - draw a random card from the deck (in state)
 * @prop {function} drawFromBottomOfDeck  - draw arbitrary number of cards from the bottom of the deck (in state)
 * @prop {function} draw  - draw arbitrary number of cards from the top of the deck (in state)
 * @prop {function} reset   - reset the deck (in state); order cards by suit and number 
 * @prop {function} shuffle   - shuffle the deck (in state)
 * @prop {function} deal  - moves an arbitrary number of cards to the current player's hand (in state)
 * @prop {function} hit   - move one card to the current player's hand (in state)
 * @prop {function} stay  - advances turn to the next player (in state)
 * @prop {function} resetGame   - resets the deck, players' hands, drawn, and selected arrays, and sets gameStatus to New 
 * @prop {string} gameStatus - string representing the current game's status
 * @prop {number} currentPlayer - index of of the players array (in state) that corresponds to the current player 
 * @prop {array} selected - array containing currently selected cards; passed in from state
  */
export class ControlPanel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      commandBarItems: []
    };
  }

  componentWillMount() {}

  render() {
    let selectedFlag = this.props.selected.length > 0 ? false : true;
    let gameStatus = this.props.gameStatus;
    let currentPlayer = this.props.currentPlayer || undefined;
    let bustedFlag = false;
    // set bustedFlag
    if (currentPlayer) {
      bustedFlag = this.props.currentPlayer.status === "busted" ? true : false;
    }

    // Define buttons in CommandBar
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
    const commandBarDefinition = {
      defaultItems: [
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
          iconProps: {iconName: "Sync"},
          disabled: false,
          onClick: this.props.shuffle
        }
      ],
      blackJackItems: [
        {
          key: "hit",
          name: "Hit",
          ariaLabel: "Hit",
          iconProps: { iconName: "Add" },
          disabled: bustedFlag,
          onClick: this.props.hit
        },
        {
          key: "stay",
          name: "Stay",
          ariaLabel: "Stay",
          iconProps: { iconName: "Forward" },
          disabled: bustedFlag,
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
      ],
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

    /**
     * Configures the game status display
     * @param {String} gameStatus
     * @returns {JSX} Game status panel
     */
    const gameStatusDisplay =
      gameStatus &&
      <p className="ms-font-l">
        <span>
          Game Status: <strong>{gameStatus || "N/A"}</strong>
        </span>
      </p>;

    /** 
       * Configures the player's panel
       * @param {Object} currentPlayer
       * @returns {JSX} Current player title and status
       */
    const currentPlayerDisplay =
      currentPlayer &&
      <p className="ms-font-l">
        <span>{`Current Player: ${currentPlayer.title}`}</span> <br />
        <span>{`Player Status: ${currentPlayer.status}`}</span>
      </p>;

    /**
     * Configure the CommandBar 
     * @param {Object} commandBarDefinition
     * @returns {Array} commandBarItems
     */
    let commandBarItems = this.state.commandBarItems.concat(
      commandBarDefinition.defaultItems
    );
    if (gameStatus) {
      commandBarItems = [].concat(commandBarDefinition.blackJackItems);
    }
    const farItems = commandBarDefinition.optionsMenu;
    const overFlowItems = selectedFlag
      ? []
      : [].concat(commandBarDefinition.putMenu, commandBarDefinition.drawMenu);

    return (
      <div id="ControlPanel">
        <CommandBar
          isSearchBoxVisible={false}
          items={commandBarItems}
          farItems={farItems}
          overflowItems={overFlowItems}
        />
        {gameStatus &&
          <div id="StatusPanel">
            {gameStatusDisplay}
            {currentPlayerDisplay}
          </div>}
      </div>
    );
  }
}

ControlPanel.propTypes = {
  putOnBottomOfDeck: T.func,
  putOnTopOfDeck: T.func,
  drawRandom: T.func,
  drawFromBottomOfDeck: T.func,
  draw: T.func,
  reset: T.func,
  shuffle: T.func,
  deal: T.func,
  hit: T.func,
  stay: T.func,
  resetGame: T.func,
  gameStatus: T.string,
  currentPlayer: T.object,
  selected: T.array,
  toggleDeckVisibility: T.func,
  toggleSelectedVisibility: T.func,
  toggleDrawnVisibility: T.func,
  isDeckVisible: T.bool,
  isDrawnVisible: T.bool,
  isSelectedVisible: T.bool
};

export default ControlPanel;
