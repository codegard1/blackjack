import React from "react";
import {
  DefaultButton,
  Dropdown,
  DefaultEffects,
  Dialog,
  DialogFooter,
  DialogType,
  Icon,
  MessageBar,
  MessageBarType,
  PrimaryButton,
  Spinner,
  SpinnerSize,
  Stack,
} from '@fluentui/react';
import { MotionAnimations } from '@fluentui/theme';
import { initializeIcons } from "@uifabric/icons";


/* custom stuff */
import BaseComponent from "../BaseComponent";
import PlayerContainer from "./PlayerContainer";
import DeckContainer from "./DeckContainer";
import OptionsPanel from "./OptionsPanel";
import PotDisplay from "./PotDisplay";
import ActivityLog from "./ActivityLog";
import {
  defaultPlayers,
  defaultPlayersObj,
  defaultPlayersDropdownOptions,
  defaultSelectedPlayerKeys
} from "./definitions";

/* flux */
import GameStore from "./stores/GameStore";
import DeckStore from "./stores/DeckStore";
import ControlPanelStore from "./stores/ControlPanelStore";
import PlayerStore from "./stores/PlayerStore";
import AppActions from "./actions/AppActions";

/* Initialize Fabric Icons */
initializeIcons();


export default class Table extends BaseComponent {
  constructor() {
    super();
    this.state = {
      // Table
      isSpinnerVisible: true,
      isDialogVisible: true,
      selectedPlayers: defaultSelectedPlayerKeys,

      // DeckStore
      deck: { cards: [] },
      drawn: [],
      selected: [],
      playerHands: [],

      // GameStore
      dealerHasControl: false,
      gameStatus: 0,
      isMessageBarVisible: false,
      loser: -1,
      minimumBet: 25,
      pot: 0,
      round: 0,
      turnCount: 0,
      winner: -1,
      messageBarDefinition: {
        type: MessageBarType.info,
        text: "",
        isMultiLine: false
      },

      // PlayerStore
      players: {},
      activePlayers: [],
      currentPlayerId: 0,

      // ControlPanelStore
      isCardDescVisible: false,
      isDealerHandVisible: false,
      isDeckVisible: false,
      isDrawnVisible: false,
      isHandValueVisible: false,
      isOptionsPanelVisible: false,
      isSelectedVisible: false,
      isActivityLogVisible: false,
    };

    this._bind(
      "onChangeDeck",
      "onChangeControlPanel",
      "onChangeGame",
      "onChangePlayerStore",
      "onHideDialog",
      "toggleHideDialog",
      "renderPlayerContainers",
      "onChangeDropDown",
      "onClickStartButton",
    );
  }

  componentDidMount() {
    /* subscribe to the stores */
    GameStore.addChangeListener(this.onChangeGame);
    DeckStore.addChangeListener(this.onChangeDeck);
    ControlPanelStore.addChangeListener(this.onChangeControlPanel);
    PlayerStore.addChangeListener(this.onChangePlayerStore);

    // Fetch local data from stores
    AppActions.initializeStores();
  }

  componentWillUnmount() {
    /* remove change listeners */
    GameStore.removeChangeListener(this.onChangeGame);
    DeckStore.removeChangeListener(this.onChangeDeck);
    ControlPanelStore.removeChangeListener(this.onChangeControlPanel);
    PlayerStore.removeChangeListener(this.onChangePlayerStore);
  }


  /* flux helpers */
  onChangeGame() {
    const newState = GameStore.getState();
    this.setState({ ...newState });
  }
  onChangeDeck() {
    const newState = DeckStore.getState();
    this.setState({ ...newState });
  }
  onChangeControlPanel() {
    const newState = ControlPanelStore.getState();
    this.setState({ ...newState });
  }
  onChangePlayerStore() {
    let { players, activePlayers, currentPlayerId } = PlayerStore.getState();
    // get and set player hands; this is probably redundant
    activePlayers.forEach(key => {
      players[key].hand = DeckStore.getHand(key);
    });
    this.setState({ players, activePlayers, currentPlayerId });
  }

  /**
   * Hide the splash screen
   */
  onHideDialog() {
    this.setState({ isDialogVisible: false })
  }

  /**
   * Toggle the splash screen
   */
  toggleHideDialog() {
    this.setState({ isDialogVisible: !this.state.isDialogVisible })
  }

  /**
   * render PlayerContainers for players listed in PlayerStore.state.activePLayers
   */
  renderPlayerContainers() {
    if (this.state.activePlayers.length > 0) {
      return this.state.activePlayers.map(key =>
        <Stack.Item align="stretch" verticalAlign="top" grow={2} key={`PlayerStack-${key}`}>
          <PlayerContainer
            key={`PlayerContainer-${key}`}
            playerKey={key}
          />

        </Stack.Item>
      );
    } else {
      return <Stack.Item>No players</Stack.Item>;
    }
  }

  onChangeDropDown(e, o, i) {
    const selectedPlayers = this.state.selectedPlayers;
    if (o.selected && selectedPlayers.indexOf(o.key) === -1) {
      selectedPlayers.push(o.key);
    } else if (!o.selected && selectedPlayers.indexOf(o.key) !== -1) {
      selectedPlayers.splice(selectedPlayers.indexOf(o.key), 1);
    }
    this.setState({ selectedPlayers });
  }

  onClickStartButton(e) {
    const players = this.state.players;
    const selectedPlayers = this.state.selectedPlayers;

    // get the complete player object for AppActions that don't use playerKey yet
    let pList = selectedPlayers.map(key => players[key]);

    // initiate a new game 
    AppActions.newGame(pList);

    // hide the player selection modal 
    this.toggleHideDialog();
  }


  /**
   * Make PlayerContainers
   */
  render() {
    // slice out the selected players (Chris and Dealer) and return PlayerContainers
    const selectedPlayersContainers = this.renderPlayerContainers();

    // Ad-hod styles for the Table
    const tableStyles = {
      boxShadow: DefaultEffects.elevation16,
      borderRadius: DefaultEffects.roundedCorner6,
      backgroundColor: 'ghostwhite',
      animation: MotionAnimations.fadeIn
    }

    return (
      <Stack vertical verticalAlign="start" wrap tokens={{ childrenGap: 10, padding: 10 }} style={tableStyles}>

        {this.state.isMessageBarVisible && (
          <MessageBar
            messageBarType={this.state.messageBarDefinition.type}
            isMultiline={this.state.messageBarDefinition.isMultiLine}
            onDismiss={AppActions.hideMessageBar}
          >
            {this.state.messageBarDefinition.text}
          </MessageBar>
        )}

        {this.state.isDialogVisible &&
          <Stack horizontal horizontalAlign="space-between" disableShrink wrap tokens={{ childrenGap: 10, padding: 10, }}>
            <Spinner size={SpinnerSize.large} label="Wait, wait..." ariaLive="assertive" labelPosition="right" />
          </Stack>
        }

        {!this.state.isDialogVisible &&
          <Stack horizontal horizontalAlign="space-between" disableShrink wrap tokens={{ childrenGap: 10, padding: 10, }}>
            <PotDisplay pot={this.state.pot} />
            <Icon iconName="Settings" aria-label="Settings" onClick={AppActions.showOptionsPanel} />
          </Stack>
        }

        {!this.state.isDialogVisible &&
          <Stack horizontal horizontalAlign="stretch" disableShrink wrap tokens={{ childrenGap: 10, padding: 10 }}>
            {selectedPlayersContainers}
          </Stack>
        }

        <ActivityLog hidden={!this.state.isActivityLogVisible} />

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

        <Dialog
          hidden={!this.state.isDialogVisible}
          onDismiss={this.toggleHideDialog}
          dialogContentProps={{
            type: DialogType.normal,
            title: 'Blackjack',
            subText: 'This is the splash screen',
          }}
          modalProps={{
            isBlocking: false,
            styles: { main: { maxWidth: 450, top: 75 } },
            isDraggable: false,
            labelId: 'dialogLabel',
            subTextId: 'subTextLabel',
            isDarkOverlay: true,
            topOffsetFixed: true,
          }}
        >
          <Dropdown
            placeholder="Choose"
            label="Select at least two players"
            multiSelect
            onChange={this.onChangeDropDown}
            options={defaultPlayersDropdownOptions}
            styles={{ width: 200 }}
          />
          <DialogFooter>
            <PrimaryButton text="Start" onClick={this.onClickStartButton} />
          </DialogFooter>
        </Dialog>

      </Stack>
    );
  }
}
