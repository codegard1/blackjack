import React from "react";
import {
  DefaultEffects,
  Icon,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize,
  Stack,
  Text
} from '@fluentui/react';
import { MotionAnimations } from '@fluentui/theme';
import { initializeIcons } from "@uifabric/icons";


/* custom stuff */
import BaseComponent from "../BaseComponent";
import PlayerContainer from "./PlayerContainer";
import DeckContainer from "./DeckContainer";
import OptionsPanel from "./OptionsPanel";
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
      isOptionsPanelVisible: false,

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
      "toggleOptionsPanel"
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
    this.setState({
      ...ControlPanelStore.getState(),
      hasInitialized: true
    });
  }
  onChangePlayerStore() {
    const { players, activePlayers, currentPlayerKey } = PlayerStore.getState();
    this.setState({ players, activePlayers, currentPlayerKey, hasInitialized: true });
  }
  onChangeStatsStore() {
    let playerStats = {};
    for (const key in this.state.activePlayers) {
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
   * Toggle the Options Panel visibility
   * @returns void
   */
  toggleOptionsPanel() {
    this.setState({ isOptionsPanelVisible: !this.state.isOptionsPanelVisible })
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
            gameStatusFlag={this.state.gameStatusFlag === 0 || this.state.gameStatusFlag > 2}
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
            dealerHasControl={this.state.dealerHasControl}
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

        <Stack horizontal horizontalAlign="end" disableShrink nowrap>
          <Icon iconName="Settings" aria-label="Settings" style={{ fontSize: "24px" }} onClick={this.toggleOptionsPanel} />
        </Stack>

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
          <Stack horizontal horizontalAlign="center" tokens={{ childrenGap: 10, padding: 10, }}>
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
          <Stack vertical verticalAlign="space-around" tokens={{ childrenGap: 10, padding: 10, }}>
            {!this.state.gameStatusFlag && <Text block nowrap variant="xLarge">Pot: ${this.state.pot}</Text>}
            <Stack horizontal horizontalAlign="stretch" disableShrink wrap tokens={{ childrenGap: 10, padding: 10 }}>
              {selectedPlayersContainers}
            </Stack>
          </Stack>
        }

        {!this.state.isDialogVisible &&
          <Stack vertical verticalAlign="stretch" wrap tokens={{ childrenGap: 10, padding: 10 }}>
            <Stack.Item>

              <ActivityLog
                hidden={!this.state.isActivityLogVisible}
              />

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

        <OptionsPanel
          isCardDescVisible={this.state.isCardDescVisible}
          isDealerHandVisible={this.state.isDealerHandVisible}
          isDeckVisible={this.state.isDeckVisible}
          isDrawnVisible={this.state.isDrawnVisible}
          isHandValueVisible={this.state.isHandValueVisible}
          isSelectedVisible={this.state.isSelectedVisible}
          isActivityLogVisible={this.state.isActivityLogVisible}
          isOptionsPanelVisible={this.state.isOptionsPanelVisible}
          toggleOptionsPanel={this.toggleOptionsPanel}
        />

      </Stack>
    );
  }
}
