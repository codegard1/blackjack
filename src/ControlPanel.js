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
    const drawItems = [
      {
        key: "shuffle",
        name: "Shuffle",
        ariaLabel: "Shuffle",
        iconProps: "",
        disabled: false,
        onClick: this.props.shuffle
      },
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
          iconProps: "",
          disabled: false,
          onClick: this.props.deal
        }
      ],
      blackJackItems: [
        {
          key: "hit",
          name: "Hit",
          ariaLabel: "Hit",
          iconProps: "",
          disabled: bustedFlag,
          onClick: this.props.hit
        },
        {
          key: "stay",
          name: "Stay",
          ariaLabel: "Stay",
          iconProps: "",
          disabled: bustedFlag,
          onClick: this.props.stay
        },
        {
          key: "reset-game",
          name: "Reset Game",
          ariaLabel: "Reset Game",
          iconProps: "",
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
      ]
    };

    const gameStatusDisplay =
      gameStatus &&
      <p className="ms-font-l">
        <span>
          Game Status: <strong>{gameStatus || "N/A"}</strong>
        </span>
      </p>;

    const currentPlayerDisplay =
      currentPlayer &&
      <p className="ms-font-l">
        <span>{`Current Player: ${currentPlayer.title}`}</span> <br />
        <span>{`Player Status: ${currentPlayer.status}`}</span>
      </p>;

    let commandBarItems = this.state.commandBarItems.concat(
      commandBarDefinition.defaultItems
    );
    if (gameStatus) {
      commandBarItems = commandBarItems.concat(
        commandBarDefinition.blackJackItems,
        commandBarDefinition.putMenu,
        commandBarDefinition.drawMenu
      );
    }

    return (
      <div id="ControlPanel">
        <CommandBar isSearchBoxVisible={false} items={commandBarItems} />
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
  selected: T.array
};

export default ControlPanel;
