import React, { Component } from "react";
import * as T from "prop-types";
import { CommandBar } from "office-ui-fabric-react/lib/CommandBar";
import { MessageBarType } from "office-ui-fabric-react/lib/MessageBar";

/* Flux */
import AppActions from "./actions/AppActions";
import {DeckStore} from './stores/DeckStore';

class ControlPanel extends Component {
  render() {
    let selectedFlag = this.props.selectedFlag;
    let selectedCards = DeckStore.getSelected(this.props.playerId);
    const gameStatusFlag =
      this.props.gameStatus > 2 || this.props.player.turn === false;

    /* currently there are no defaults (8.22.12) */
    const defaultItems = [];
    const drawItems = [
      {
        key: "draw",
        name: "Draw",
        ariaLabel: "Draw",
        iconProps: "",
        disabled: false,
        onClick: AppActions.draw
      },
      {
        key: "draw-from-bottom-of-deck",
        name: "Draw from Bottom of Deck",
        ariaLabel: "Draw from Bottom of Deck",
        iconProps: "",
        disabled: false,
        onClick: AppActions.drawFromBottomOfDeck
      },
      {
        key: "draw-random",
        name: "Draw Random",
        ariaLabel: "Draw Random",
        iconProps: "",
        disabled: false,
        onClick: AppActions.drawRandom
      }
    ];
    const putItems = [
      {
        key: "put-on-top-of-deck",
        name: "Put on Top of Deck",
        ariaLabel: "Put on Top of Deck",
        iconProps: "",
        disabled: false,
        onClick: ev => {
          ev.preventDefault();
          AppActions.putOnTopOfDeck(this.props.playerId, selectedCards);
          AppActions.removeSelectedFromPlayerHand(selectedCards);
        }
      },
      {
        key: "put-on-bottom-of-deck",
        name: "Put on Bottom of Deck",
        ariaLabel: "Put on Bottom of Deck",
        iconProps: "",
        disabled: false,
        onClick: cards => {
          AppActions.putOnBottomOfDeck(cards);
          AppActions.removeSelectedFromPlayerHand(cards);
        }
      }
    ];
    const blackJackItems = [
      {
        key: "hit",
        name: "Hit",
        ariaLabel: "Hit",
        iconProps: { iconName: "Add" },
        disabled: gameStatusFlag,
        onClick: () => {
          AppActions.hit(this.props.playerId);
        }
      },
      {
        key: "bet",
        name: `Bet $${this.props.minimumBet}`,
        ariaLabel: `Bet $${this.props.minimumBet}`,
        iconProps: { iconName: "Up" },
        disabled: gameStatusFlag,
        onClick: (ev, target, playerIndex, amount) => {
          ev.preventDefault();
          AppActions.bet(this.props.playerId, amount);
        }
      },
      {
        key: "stay",
        name: "Stay",
        ariaLabel: "Stay",
        iconProps: { iconName: "Forward" },
        disabled: gameStatusFlag,
        onClick: AppActions.stay
      },
      {
        key: "new-round",
        name: "New Round",
        ariaLabel: "New Round",
        iconProps: { iconName: "Refresh" },
        disabled: false,
        onClick: () => {
          AppActions.newDeck();
          AppActions.newRound();
          AppActions.showMessageBar("New Round", MessageBarType.info);
        }
      }
    ];
    const drawMenu = [
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
    ];
    const putMenu = [
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
    ];

    /* configure which items appear in the CommandBar */
    const commandBarItems =
      this.props.gameStatus > 0 ? defaultItems : blackJackItems;

    const farItems = [
      // {
      //   key: "test",
      //   name: `selectedFlag: ${selectedFlag}`,
      //   iconProps: "",
      //   disabled: true
      // }
    ];
    const overFlowItems = selectedFlag ? [].concat(putMenu, drawMenu) : [];

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
  playerId: T.number.isRequired,
  gameStatus: T.number.isRequired,
  minimumBet: T.number.isRequired,
  hidden: T.bool.isRequired,
  selectedFlag: T.bool.isRequired
};

export default ControlPanel;
