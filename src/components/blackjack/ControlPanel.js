import React, { Component } from "react";
import * as T from "prop-types";
import { CommandBar, MessageBarType } from "@fluentui/react";

/* Flux */
import AppActions from "./actions/AppActions";
// import { DeckStore } from "./stores/DeckStore";

class ControlPanel extends Component {
  static propTypes = {
    gameStatus: T.number.isRequired,
    gameStatusFlag: T.bool.isRequired,
    hidden: T.bool.isRequired,
    minimumBet: T.number.isRequired,
    player: T.object,
    playerIsNPC: T.bool.isRequired,
    playerId: T.number.isRequired,
    playerStatusFlag: T.bool.isRequired,
    selectedFlag: T.bool.isRequired,
    showDeckCallout: T.func.isRequired,
  };

  render() {
    /* selectedFlag is true when the player has selected cards in his hand */
    // let selectedFlag = this.props.selectedFlag;
    /* Flag used by put / draw menu items */
    // let selectedCards = selectedFlag
    //   ? DeckStore.getSelected(this.props.playerId)
    //   : [];
    /* when gameStatusFlag is TRUE, most members of blackJackItems are disabled */
    const gameStatusFlag = this.props.gameStatusFlag;
    const playerStatusFlag = this.props.playerStatusFlag;
    const npcFlag = this.props.playerIsNPC;

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
    //       AppActions.putOnTopOfDeck(this.props.playerId, selectedCards);
    //       AppActions.removeSelectedFromPlayerHand(selectedCards);
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
    //       AppActions.removeSelectedFromPlayerHand(cards);
    //     }
    //   }
    // ];
    let blackJackItems = [
      {
        key: "hit",
        name: "Hit",
        ariaLabel: "Hit",
        iconProps: { iconName: "Add" },
        disabled: gameStatusFlag || playerStatusFlag,
        onClick: ev => {
          ev.preventDefault();
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
        disabled: gameStatusFlag || playerStatusFlag,
        onClick: () => AppActions.stay(this.props.playerId),
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

    const farItems = npcFlag
      ? []
      : [
        // Settings button moved to Table on 10.29.20
        // {
        //   key: "options",
        //   name: "",
        //   ariaLabel: "Options",
        //   iconProps: { iconName: "Settings" },
        //   disabled: npcFlag,
        //   onClick: AppActions.showOptionsPanel
        // }
        {
          key: "new-round",
          name: "Deal",
          ariaLabel: "Deal",
          iconProps: { iconName: "Refresh" },
          disabled: !gameStatusFlag,
          onClick: () => {
            AppActions.newDeck();
            AppActions.newRound();
            AppActions.showMessageBar("New Round", MessageBarType.info);
          }
        }
      ];

    // const overFlowItems = selectedFlag ? [].concat(putMenu, drawMenu) : [];
    const overFlowItems = [];

    return (
      <div className="player-controlpanel">
        {!this.props.hidden && (
          <CommandBar
            isSearchBoxVisible={false}
            items={blackJackItems}
            farItems={farItems}
            overflowItems={overFlowItems}
          />
        )}
      </div>
    );
  }
}

export default ControlPanel;
