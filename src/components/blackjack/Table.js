import React from "react";
import { Stack, MessageBar, MessageBarType, DefaultEffects } from '@fluentui/react';
import { MotionAnimations } from '@fluentui/theme';
import { initializeIcons } from "@uifabric/icons";

/* custom stuff */
import BaseComponent from "../BaseComponent";
import PlayerContainer from "./PlayerContainer";
import DeckContainer from "./DeckContainer";
import OptionsPanel from "./OptionsPanel";
import { defaultPlayers } from "./definitions";
import PotDisplay from "./PotDisplay";

/* flux */
import { GameStore } from "./stores/GameStore";
import { DeckStore } from "./stores/DeckStore";
import ControlPanelStore from "./stores/ControlPanelStore";
import AppActions from "./actions/AppActions";

/* Initialize Fabric Icons */
initializeIcons();

export default class Table extends BaseComponent {
  constructor() {
    super();
    this.state = {
      //DeckStore
      deck: { cards: [] },
      drawn: [],
      selected: [],
      playerHands: [],
      //GameStore
      gameStatus: 0,
      minimumBet: 25,
      players: [],
      pot: 0,
      round: 0,
      turnCount: 0,
      // ControlPanelStore
      isDealerHandVisible: false,
      isDeckVisible: false,
      isDrawnVisible: false,
      isHandValueVisible: false,
      isMessageBarVisible: false,
      isOptionsPanelVisible: false,
      isCardDescVisible: false,
      isSelectedVisible: false,
      messageBarDefinition: {
        type: MessageBarType.info,
        text: "",
        isMultiLine: false
      },
    };

    this._bind("onChangeDeck", "onChangeControlPanel", "onChangeGame");
  }

  componentDidMount() {
    /* callback when a change emits from GameStore*/
    GameStore.addChangeListener(this.onChangeGame);
    DeckStore.addChangeListener(this.onChangeDeck);
    ControlPanelStore.addChangeListener(this.onChangeControlPanel);

    this.onChangeControlPanel();
    this.onChangeDeck();
    this.onChangeGame();

    /* start a new game with these players */
    AppActions.newGame(defaultPlayers);
  }

  componentWillUnmount() {
    /* remove change listeners */
    GameStore.removeChangeListener(this.onChangeGame);
    DeckStore.removeChangeListener(this.onChangeDeck);
    ControlPanelStore.removeChangeListener(this.onChangeControlPanel);
  }

  /* flux helpers */
  onChangeGame() {
    const newState = GameStore.getState();
    newState.players.forEach(player => {
      const newHand = DeckStore.getHand(player.id);
      player.hand = newHand;
    });
    this.setState(newState);
  }
  onChangeDeck() {
    const newState = DeckStore.getState();
    this.setState({ ...newState });
  }
  onChangeControlPanel() {
    const newState = ControlPanelStore.getState();
    this.setState({ ...newState });
  }

  render() {
    // slice out the selected players (Chris and Dealer) and return PlayerContainers
    const selectedPlayersContainers = this.state.players
      .filter(v => v.title === 'Chris' || v.title === "Dealer")
      .map(player => (
        <Stack.Item align="stretch" verticalAlign="top" grow={2}>
          <PlayerContainer key={`Player-${player.id}`} playerId={player.id} />
        </Stack.Item>
      ));

    // Ad-hod styles for the Table
    const tableStyles = {
      boxShadow: DefaultEffects.elevation16,
      borderRadius: DefaultEffects.roundedCorner6,
      backgroundColor: 'ghostwhite',
      animation: MotionAnimations.fadeIn
    }

    return (
      <Stack vertical verticalAlign="start" wrap tokens={{ childrenGap: 5, padding: 10 }} style={tableStyles}>
        {this.state.isMessageBarVisible && (
          <MessageBar
            messageBarType={this.state.messageBarDefinition.type}
            isMultiline={this.state.messageBarDefinition.isMultiLine}
            onDismiss={AppActions.hideMessageBar}
          >
            {this.state.messageBarDefinition.text}
          </MessageBar>
        )}

        <PotDisplay pot={this.state.pot} />

        <Stack horizontal horizontalAlign="stretch" disableShrink wrap tokens={{ childrenGap: 10, padding: 10 }}>
          {/* <Stack.Item align="stretch" verticalAlign="top" grow={2}>
            {playersArray[0]}
          </Stack.Item>
          <Stack.Item align="stretch" grow={2}>
            {playersArray[1]}
          </Stack.Item> */}
          {selectedPlayersContainers}
        </Stack>

        <DeckContainer
          deck={this.state.deck.cards}
          title="Deck"
          hidden={!this.state.isDeckVisible}
          isSelectable={false}
          isCardDescVisible={this.state.isCardDescVisible}
        />

        <DeckContainer
          deck={this.state.drawn}
          title="Drawn Cards"
          hidden={!this.state.isDrawnVisible}
          isSelectable={false}
          isCardDescVisible={this.state.isCardDescVisible}
        />

        <DeckContainer
          deck={this.state.selected}
          title="Selected Cards"
          hidden={!this.state.isSelectedVisible}
          isSelectable={false}
          isCardDescVisible={this.state.isCardDescVisible}
        />

        <OptionsPanel />

      </Stack>
    );
  }
}
