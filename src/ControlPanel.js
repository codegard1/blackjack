import React, { Component } from "react";
import * as T from "prop-types";
import { CommandBar } from "office-ui-fabric-react/lib/CommandBar";

/** Contains buttons that manipulate state in Table
 * @namespace
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
 * @prop {array} selectedCards - array containing currently selected cards; passed in from state
  */
export class ControlPanel extends Component {
  /**
   * @namespace ControlPanel
   * @constructor
   */
  constructor(props) {
    super(props);
    this.state = {
      /**
       * @type {array}
       * @defaultvalue
       */
      commandBarItems: []
    };
  }

  render() {
    let selectedFlag = this.props.selectedCards.length > 0 ? false : true;
    let gameStatus = this.props.gameStatus;
    let currentPlayer = this.props.currentPlayer || undefined;

    const bustedFlag = this.props.currentPlayer.status === "busted";
    const blackjackflag = this.props.currentPlayer.status === "blackjack";
    const gameStatusFlag = gameStatus > 1 && gameStatus !== 6;

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

    /**
     * Menu items related to drawing cards from the deck
     * @memberof ControlPanel
     * @property {array} - items for the Options menu
     */
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

    /**
     * Menu items related to putting cards in the deck
     * @memberof ControlPanel
     * @property {array} - items for the Options menu
     */
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

    /**
     * master repository of menu items
     * @memberof ControlPanel
     * @property {object} - items for the Options menu
     */
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

    /**
     * Configure the CommandBar 
     * @memberof ControlPanel
     * @param {object} commandBarDefinition
     */
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
        {!this.props.hidden &&
          
          <StatusDisplay {...this.props} />}
      </div>
    );
  }
}

/**
 * Defines the propTypes for ControlPanel
 * @memberof ControlPanel
 */
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
  gameStatus: T.number.isRequired,
  currentPlayer: T.object.isRequired,
  selected: T.array,
  toggleDeckVisibility: T.func,
  toggleSelectedVisibility: T.func,
  toggleDrawnVisibility: T.func,
  isDeckVisible: T.bool,
  isDrawnVisible: T.bool,
  isSelectedVisible: T.bool,
  turnCount: T.number
};

export default ControlPanel;

export function StatusDisplay(props) {
  let gameStatus = props.gameStatus;
  let currentPlayer = props.currentPlayer || undefined;

  /**
     * If gameStatus is not undefined then set gameStatusDisplay to a JSX element containing {gamestatus}
     * @memberof ControlPanel
     * @param {string} gameStatus
     */
  const gameStatusDisplay = (
    <span className="ms-font-m" style={{ float: "left" }}>
      Game Status: <strong>{gameStatus}</strong>
      <br />
      Turn Count: {props.turnCount}
    </span>
  );

  /** 
       * If currentPlayer is set then set currentPLayerDisplay to a JSX element containing {currentPlayer.title} and {currentPlayer.status}
       * @memberof ControlPanel
       * @param {object} currentPlayer
       */
  const currentPlayerDisplay = (
    <p className="ms-font-l">
      <span>{`Current Player: ${currentPlayer.title}`}</span> <br />
      <span>{`Player Status: ${currentPlayer.status}`}</span>
    </p>
  );

  return (
    <div id="StatusPanel">
      {gameStatusDisplay}
      {currentPlayerDisplay}
    </div>
  );
}
