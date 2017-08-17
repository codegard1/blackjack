import React, { Component } from "react";
import * as T from "prop-types";
import { CommandBar } from "office-ui-fabric-react/lib/CommandBar";

/* Flux */
import { AppActions } from "./actions/AppActions";

export class ControlPanel extends Component {
  render() {
    let selectedFlag = this.props.selectedCards.length > 0 ? false : true;
    let gameStatus = this.props.gameStatus;
    //let player = this.props.player || undefined;
    //const bustedFlag = player.status === "busted";
    //const blackjackflag = player.status === "blackjack";
    const gameStatusFlag = gameStatus > 2 || this.props.player.turn === false;

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
        onClick: () => { this.props.hit(this.props.player.id); }
      },
      {
        key: "bet",
        name: `Bet $${this.props.minimumBet}`,
        ariaLabel: `Bet $${this.props.minimumBet}`,
        iconProps: { iconName: "Up" },
        disabled: gameStatusFlag,
        onClick: this.props.bet
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
        key: "new-round",
        name: "New Round",
        ariaLabel: "New Round",
        iconProps: { iconName: "Refresh" },
        disabled: false,
        onClick: this.props.newRound
      }
    ];

    const optionsButton = [
      {
        key: "options",
        name: "Options",
        ariaLabel: "Options",
        iconProps: { iconName: "Options" },
        onClick: AppActions.showOptionsPanel
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
      optionsButton
    };

    let commandBarItems = commandBarDefinition.defaultItems;
    if (gameStatus > 0) {
      commandBarItems = [].concat(commandBarDefinition.blackJackItems);
    }
    const farItems = commandBarDefinition.optionsButton;
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

ControlPanel.propTypes = {
  deal: T.func,
  hit: T.func,
  bet: T.func,
  minimumBet: T.number,
  stay: T.func,
  draw: T.func,
  reset: T.func,
  shuffle: T.func,
  putOnBottomOfDeck: T.func,
  putOnTopOfDeck: T.func,
  drawRandom: T.func,
  drawFromBottomOfDeck: T.func,
  gameStatus: T.number,
  currentPlayer: T.number,
  selectedCards: T.array,
  isDeckVisible: T.bool,
  isDrawnVisible: T.bool,
  isSelectedVisible: T.bool,
  turnCount: T.number,
  hidden: T.bool,
  showOptionsPanel: T.func,
  newRound: T.func
};

export default ControlPanel;
