import React from "react";
import {
  DefaultEffects,
  Icon,
  MessageBar,
  MessageBarType,
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
import SplashScreen from "./SplashScreen";

/* flux */
import GameStore from "./stores/GameStore";
import DeckStore from "./stores/DeckStore";
import ControlPanelStore from "./stores/ControlPanelStore";
import PlayerStore from "./stores/PlayerStore";
import StatsStore from "./stores/StatsStore";
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
      hasInitialized: false,
      isDeckCalloutVisible: false,

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
      currentPlayerKey: 0,

      // ControlPanelStore
      isCardDescVisible: false,
      isDealerHandVisible: false,
      isDeckVisible: false,
      isDrawnVisible: false,
      isHandValueVisible: false,
      isOptionsPanelVisible: false,
      isSelectedVisible: false,
      isActivityLogVisible: false,

      // StatsStore
      playerStats: {}
    };

    this._bind(
      "onChangeDeck",
      "onChangeControlPanel",
      "onChangeGame",
      "onChangePlayerStore",
      "onChangeStatsStore",
      "onHideDialog",
      "toggleHideDialog",
      "renderPlayerContainers",
    );
  }

  componentDidMount() {
    /* subscribe to the stores */
    GameStore.addChangeListener(this.onChangeGame);
    DeckStore.addChangeListener(this.onChangeDeck);
    ControlPanelStore.addChangeListener(this.onChangeControlPanel);
    PlayerStore.addChangeListener(this.onChangePlayerStore);
    StatsStore.addChangeListener(this.onChangeStatsStore);

    // Fetch local data from stores
    AppActions.initializeStores();
  }

  componentWillUnmount() {
    /* remove change listeners */
    GameStore.removeChangeListener(this.onChangeGame);
    DeckStore.removeChangeListener(this.onChangeDeck);
    ControlPanelStore.removeChangeListener(this.onChangeControlPanel);
    PlayerStore.removeChangeListener(this.onChangePlayerStore);
    StatsStore.removeChangeListener(this.onChangeStatsStore);
  }


  /* flux helpers */
  onChangeGame() {
    const { dealerHasControl, gameStatus, isMessageBarVisible, loser, minimumBet, pot, round, turnCount, winner, messageBarDefinition } = GameStore.getState();
    this.setState({
      dealerHasControl,
      gameStatus,
      isDeckCalloutVisible: true,
      isMessageBarVisible,
      loser,
      messageBarDefinition,
      minimumBet,
      pot,
      round,
      turnCount,
      winner,
    });
  }
  onChangeDeck() {
    const { deck, drawn, selected, playerHands } = DeckStore.getState();
    this.setState({ deck, drawn, selected, playerHands });
  }
  onChangeControlPanel() {
    const {
      isActivityLogVisible,
      isCardDescVisible,
      isDealerHandVisible,
      isDeckVisible,
      isDrawnVisible,
      isHandValueVisible,
      isOptionsPanelVisible,
      isSelectedVisible,
    } = ControlPanelStore.getState();
    this.setState({
      isActivityLogVisible,
      isCardDescVisible,
      isDealerHandVisible,
      isDeckVisible,
      isDrawnVisible,
      isHandValueVisible,
      isOptionsPanelVisible,
      isSelectedVisible,
      hasInitialized: true
    });
  }
  onChangePlayerStore() {
    const { players, activePlayers, currentPlayerKey } = PlayerStore.getState();
    // get and set player hands; this is probably redundant
    // activePlayers.forEach(key => {
    // players[key].hand = DeckStore.getHand(key);
    // });
    this.setState({ players, activePlayers, currentPlayerKey, hasInitialized: true });
  }
  onChangeStatsStore() {
    let playerStats = {};
    for (let key in this.state.activePlayers) {
      playerStats[key] = StatsStore.getStats(key)
    }
    this.setState({ playerStats });
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
      return this.state.activePlayers.map(key => {
        const playerHand = this.state.playerHands[key] || {};
        const playerStats = this.state.playerStats[key] || {};
        return <Stack.Item align="stretch" verticalAlign="top" grow={2} key={`PlayerStack-${key}`}>
          <PlayerContainer
            gameStatus={this.state.gameStatus}
            gameStatusFlag={this.state.gameStatusFlag === 0 || this.state.gameStatusFlag > 2 }
            isCardDescVisible={this.state.isCardDescVisible}
            isDealerHandVisible={this.state.isDealerHandVisible}
            isDeckCalloutVisible={this.state.isDeckCalloutVisible}
            isHandValueVisible={this.state.isHandValueVisible}
            key={`PlayerContainer-${key}`}
            minimumBet={this.state.minimumBet}
            player={this.state.players[key]}
            playerHand={playerHand}
            playerKey={key}
            playerStats={playerStats}
          />
        </Stack.Item>
      }
      );
    } else {
      return <Stack.Item>No players</Stack.Item>;
    }
  }


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
            <Spinner
              size={SpinnerSize.large}
              label="Wait, wait..."
              ariaLive="assertive"
              labelPosition="right"
              style={{ animation: MotionAnimations.scaleDownIn }}
            />
            <SplashScreen
              players={this.state.players}
              hidden={!this.state.isDialogVisible}
              toggleHide={this.toggleHideDialog}
              onHide={this.onHideDialog}
            />
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

        {!this.state.isDialogVisible &&
          <Stack vertical verticalAlign="stretch" wrap tokens={{ childrenGap: 10, padding: 10 }}>
            <Stack.Item>
              <ActivityLog hidden={!this.state.isActivityLogVisible} />
            </Stack.Item>
            <Stack.Item>
              <DeckContainer
                deck={this.state.deck.cards}
                title="Deck"
                hidden={!this.state.isDeckVisible}
                isSelectable={false}
                isCardDescVisible={this.state.isCardDescVisible}
              />
            </Stack.Item>
            <Stack.Item>
              <DeckContainer
                deck={this.state.drawn}
                title="Drawn Cards"
                hidden={!this.state.isDrawnVisible}
                isSelectable={false}
                isCardDescVisible={this.state.isCardDescVisible}
              />
            </Stack.Item>
            <Stack.Item>
              <DeckContainer
                deck={this.state.selected}
                title="Selected Cards"
                hidden={!this.state.isSelectedVisible}
                isSelectable={false}
                isCardDescVisible={this.state.isCardDescVisible}
              />
            </Stack.Item>
          </Stack>
        }

        <OptionsPanel />

      </Stack>
    );
  }
}
