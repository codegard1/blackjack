import React, { Component } from "react";
import * as T from "prop-types";
import { CommandBar } from "office-ui-fabric-react/lib/CommandBar";
import { MessageBarType } from "office-ui-fabric-react/lib/MessageBar";

/* Flux */
import AppActions from "./actions/AppActions";
import { DeckStore } from "./stores/DeckStore";

class ControlPanel extends Component {
  render() {
    /* selectedFlag is true when the player has selected cards in his hand */
    let selectedFlag = this.props.selectedFlag;
    let selectedCards = selectedFlag
      ? DeckStore.getSelected(this.props.playerId)
      : [];
    /* when gameStatusFlag is TRUE, most members of blackJackItems are disabled */
    const gameStatusFlag = this.props.gameStatusFlag;
    const playerStatusFlag = this.props.playerStatusFlag;
    const npcFlag = this.props.player.isNPC;

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
    let blackJackItems = [
      {
        key: "hit",
        name: "Hit",
        ariaLabel: "Hit",
        iconProps: { iconName: "Add" },
        disabled: (gameStatusFlag || playerStatusFlag),
        onClick: ev => {
          ev.preventDefault();
          this.props.showDeckCallout();
          AppActions.hit(this.props.playerId);
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
      //     AppActions.bet(this.props.playerId, amount);
      //   }
      // },
      {
        key: "stay",
        name: "Stay",
        ariaLabel: "Stay",
        iconProps: { iconName: "Forward" },
        disabled: (gameStatusFlag || playerStatusFlag),
        onClick: AppActions.stay
      }
    ];

    if (npcFlag === false) {
      blackJackItems.push({
        key: "new-round",
        name: "New Round",
        ariaLabel: "New Round",
        iconProps: { iconName: "Refresh" },
        disabled: !gameStatusFlag,
        onClick: () => {
          AppActions.newDeck();
          AppActions.newRound();
          AppActions.showMessageBar("New Round", MessageBarType.info);
        }
      });
    }

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

    const farItems = npcFlag ? [] : [
      {
        key: "options",
        name: "",
        ariaLabel: "Options",
        iconProps: { iconName: "Settings" },
        disabled: npcFlag,
        onClick: AppActions.showOptionsPanel
      },
    ];
    // const overFlowItems = selectedFlag ? [].concat(putMenu, drawMenu) : [];
    const overFlowItems = [];

    return (
      <div className="player-controlpanel" >
        {!this.props.hidden &&
          <CommandBar
            isSearchBoxVisible={false}
            items={blackJackItems}
            farItems={farItems}
            overflowItems={overFlowItems}
          />}
      </div >
    );
  }
}

ControlPanel.propTypes = {
  playerId: T.number.isRequired,
  gameStatus: T.number.isRequired,
  gameStatusFlag: T.bool.isRequired,
  playerStatusFlag: T.bool.isRequired,
  minimumBet: T.number.isRequired,
  hidden: T.bool.isRequired,
  selectedFlag: T.bool.isRequired
};

export default ControlPanel;
