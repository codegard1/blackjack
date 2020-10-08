import React from "react";
import { Stack, MessageBar, MessageBarType, DefaultEffects } from '@fluentui/react';
import { MotionAnimations } from '@fluentui/theme';
import { initializeIcons } from "@uifabric/icons";
import { get, set, keys } from 'idb-keyval';

/* custom stuff */
import BaseComponent from "../BaseComponent";
import PlayerContainer from "./PlayerContainer";
import DeckContainer from "./DeckContainer";
import OptionsPanel from "./OptionsPanel";
import { defaultPlayers } from "./definitions";
import PotDisplay from "./PotDisplay";
import UserForm from "./UserForm";
import DebugDisplay from "./DebugDisplay";

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
      deck: [],
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
      isSelectedVisible: false,
      messageBarDefinition: {
        type: MessageBarType.info,
        text: "",
        isMultiLine: false
      },
      debugMessage: "null",
      playersData: undefined
    };

    //Flux helpers
    this._bind("onChangeDeck", "onChangeControlPanel", "onChangeGame", "getSavedData");
  }
  // Check for saved player data
  // TODO: integrate this into Flux 
  getSavedData() {
    get('players').then((d) => {
      console.log(`Loaded players data.`);
      this.setState({ debugMessage: JSON.stringify(d) })
    })
      .catch(err => {
        console.log('No player data found. Using defaults instead.');
        this.setState({ debugMessage: `No player data found. ${err}` });
        set('players', defaultPlayers)
          .then(() => this.setState({ playersData: defaultPlayers }))
          .catch(err => {
            console.log(`Failed to load data. ${err}`);
            this.setState({ debugMessage: err, playersData: defaultPlayers });
          });
      });
  }

  componentDidMount() {
    /* callback when a change emits from GameStore*/
    GameStore.addChangeListener(this.onChangeGame);
    DeckStore.addChangeListener(this.onChangeDeck);
    ControlPanelStore.addChangeListener(this.onChangeControlPanel);

    /* Get saved data from the Internal DB */
    this.getSavedData();

    /* start a new game with these players */
    AppActions.newGame(defaultPlayers);
  }

  componentWillUnmount() {
    /* remove change listeners */
    GameStore.removeChangeListener(this.onChangeGame);
    DeckStore.removeChangeListener(this.onChangeDeck);
    ControlPanelStore.addChangeListener(this.onChangeControlPanel);
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
    this.setState({
      deck: newState.deck,
      selected: newState.selected,
      drawn: newState.drawn
    });
  }
  onChangeControlPanel() {
    const newState = ControlPanelStore.getState();
    this.setState({
      isDeckVisible: newState.isDeckVisible,
      isDrawnVisible: newState.isDrawnVisible,
      isSelectedVisible: newState.isSelectedVisible,
      // isOptionsPanelVisible: newState.isOptionsPanelVisible,
      // isDealerHandVisible: newState.isDealerHandVisible,
      // isHandValueVisible: newState.isHandValueVisible,
      isMessageBarVisible: newState.isMessageBarVisible,
      messageBarDefinition: newState.messageBarDefinition
    });
  }


  render() {
    const playersArray = this.state.players.map(player => (
      <PlayerContainer key={`Player-${player.id}`} playerId={player.id} />
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
          <Stack.Item align="stretch" verticalAlign="top" grow={2}>
            {playersArray[0]}
          </Stack.Item>
          <Stack.Item align="stretch" grow={2}>
            {playersArray[1]}
          </Stack.Item>
        </Stack>

        {this.state.isDeckVisible && (
          <DeckContainer
            deck={this.state.deck.cards}
            title="Deck"
            hidden={false}
            isSelectable={false}
          />
        )}

        {this.state.isDrawnVisible && (
          <DeckContainer
            deck={this.state.drawn}
            title="Drawn Cards"
            hidden={false}
            isSelectable={false}
          />
        )}

        {this.state.isSelectedVisible && (
          <DeckContainer
            deck={this.state.selected}
            title="Selected Cards"
            hidden={false}
            isSelectable={false}
          />
        )}

        <OptionsPanel gameStatus={this.state.gameStatus} />

        <Stack horizontal horizontalAlign="space-between">
          <UserForm />
          <DebugDisplay textContent={this.state.debugMessage} />
        </Stack>

      </Stack>
    );
  }
}
