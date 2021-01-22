import React from "react";
import * as T from "prop-types";
import { Stack, Text } from "@fluentui/react";

/* custom stuff */
import BaseComponent from "../BaseComponent";
import DeckContainer from "./DeckContainer";
import DeckCallout from "./DeckCallout";
import ControlPanel from "./ControlPanel";
import StatusDisplay from "./StatusDisplay";
import Agent from "./Agent";
import "./PlayerContainer.css";

/* flux */
import GameStore from "./stores/GameStore";
import DeckStore from "./stores/DeckStore";
import PlayerStore from "./stores/PlayerStore";
import StatsStore from "./stores/StatsStore";
import ControlPanelStore from "./stores/ControlPanelStore";

export class PlayerContainer extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      dealerHasControl: false,
      deck: [],
      gameStatus: 0,
      gameStatusFlag: true,
      handValue: { aceAsEleven: 0, aceAsOne: 0 },
      id: this.props.playerId,
      isCardDescVisible: false,
      isDealerHandVisible: true,
      isDeckCalloutVisible: false,
      isHandValueVisible: true,
      isNPC: false,
      isStatusCalloutVisible: false,
      minimumBet: 0,
      player: { empty: true },
      playerStatusFlag: true,
      selectedFlag: false,
      stats: {
        numberOfGamesLost: 0,
        numberOfGamesPlayed: 0,
        numberOfGamesWon: 0,
        numberOfHandsPlayer: 0,
        numberOfTimesBlackjack: 0,
        numberOfTimesBusted: 0,
        winLossRatio: "1.000"
      },
      title: "",
      turnCount: 0
    };

    this._bind(
      "_hideDeckCallout",
      "_showDeckCallout",
      "onChangeControlPanel",
      "onChangeDeck",
      "onChangeGame",
      "onChangeStats",
      "onChangePlayer"
    );
  }
  static propTypes = {
    playerId: T.number.isRequired
  };

  componentDidMount() {
    /* callback when a change emits from GameStore*/
    ControlPanelStore.addChangeListener(this.onChangeControlPanel);
    DeckStore.addChangeListener(this.onChangeDeck);
    GameStore.addChangeListener(this.onChangeGame);
    StatsStore.addChangeListener(this.onChangeStats);
    PlayerStore.addChangeListener(this.onChangePlayer);

    // force initial update, in case saved data was loaded from IDB
    this.onChangeGame();
    this.onChangeControlPanel();
    // this.onChangeStats();
  }

  componentWillUnmount() {
    /* remove change listeners */
    ControlPanelStore.removeChangeListener(this.onChangeControlPanel);
    DeckStore.removeChangeListener(this.onChangeDeck);
    GameStore.removeChangeListener(this.onChangeGame);
    StatsStore.removeChangeListener(this.onChangeStats);
  }

  /**
   * flux helpers
   */

  /* what to do when the game state changes */
  onChangeGame() {
    const newState = GameStore.getState();

    /* when gameStatusFlag is TRUE, most members of blackJackItems are disabled */
    const gameStatusFlag = newState.gameStatus === 0 || newState.gameStatus > 2;

    this.setState({
      dealerHasControl: newState.dealerHasControl,
      gameStatus: newState.gameStatus,
      gameStatusFlag,
      isDeckCalloutVisible: true,
      minimumBet: newState.minimumBet,
      turnCount: newState.turnCount,
    });
  }

  /* what to do when the deck state changes */
  onChangeDeck() {
    /* selectedFlag is true if getSelected() returns an array */
    const selectedFlag = !!DeckStore.getSelected(this.state.id);
    this.setState({
      deck: DeckStore.getHand(this.state.id),
      handValue: DeckStore.getHandValue(this.state.id),
      selectedFlag
    });
  }

  /* what to do when the game options change */
  onChangeControlPanel() {
    const newState = ControlPanelStore.getState();
    this.setState({
      isDealerHandVisible: newState.isDealerHandVisible,
      isHandValueVisible: newState.isHandValueVisible,
      isCardDescVisible: newState.isCardDescVisible
    });
  }

  /* What to do when the player stats change */
  async onChangeStats() {
    const stats = await StatsStore.getStats(this.state.id);
    // Don't update if getStats() returns false
    if (stats) this.setState({ stats });
  }

  /* What to do when the Player Store changes */
  onChangePlayer() {
    const newState = PlayerStore.getState();
    const thisPlayer = newState.players[this.state.id];

    /* playerStatusFlag is TRUE when the player cannot play. */
    const playerStatusFlag =
      thisPlayer.isBusted ||
      thisPlayer.isFinished ||
      thisPlayer.isStaying ||
      !thisPlayer.turn;

      this.setState({
        bank: thisPlayer.bank,
        isNPC: thisPlayer.isNPC,
        player: thisPlayer,
        playerStatusFlag,
        title: thisPlayer.title,
      })
  }

  _showDeckCallout() {
    this.setState({ isDeckCalloutVisible: true });
  }

  _hideDeckCallout() {
    this.setState({ isDeckCalloutVisible: false });
  }

  render() {
    /* style PlayerContainer conditionally */
    let playerContainerClass = "PlayerContainer ";
    if (!this.state.player.empty && this.state.player.turn) {
      playerContainerClass += "selected ";
    }
    if (
      !this.state.player.empty &&
      this.state.player.isStaying &&
      !this.state.player.turn
    ) {
      playerContainerClass += "staying ";
    }

    return (
      <Stack verticalAlign className={playerContainerClass}>
        <Stack horizontal horizontalAlign="space-between" style={{ padding: '5px' }} className={`${this.state.title}-titleBar playerContainerClass`}>
          <Stack.Item align="start">
            <Text block nowrap variant="large">
              {`${this.state.title} ($${this.state.bank || 0})  `}</Text>
          </Stack.Item>
          <Stack.Item>
            <StatusDisplay player={this.state.player} stats={this.state.stats} />
          </Stack.Item>
        </Stack>
        <Stack verticalAlign horizontalAlign="space-between">
          {this.state.isNPC &&
            this.state.dealerHasControl && <Agent {...this.state} />}
          {!this.state.isNPC && (
            <Stack.Item>
              <ControlPanel
                gameStatus={this.state.gameStatus}
                gameStatusFlag={this.state.gameStatusFlag}
                hidden={false}
                minimumBet={this.state.minimumBet}
                player={this.state.player}
                playerId={this.state.id}
                playerStatusFlag={this.state.playerStatusFlag}
                playerIsNPC={this.state.isNPC}
                selectedFlag={this.state.selectedFlag}
                showDeckCallout={this._showDeckCallout}
              />
            </Stack.Item>
          )}

          {this.state.deck.length > 0 && (
            <Stack.Item className={`DeckCalloutTarget-${this.state.title}`}>
              <DeckContainer
                deck={this.state.deck}
                gameStatus={this.state.gameStatus}
                gameStatusFlag={this.gameStatusFlag}
                handValue={this.state.handValue}
                hidden={false}
                isCardDescVisible={this.state.isCardDescVisible}
                isDealerHandVisible={this.state.isDealerHandVisible}
                isHandValueVisible={this.state.isHandValueVisible}
                isNPC={this.state.isNPC}
                isPlayerDeck
                isSelectable
                player={this.state.player}
                title={this.state.title}
                turnCount={this.state.turnCount}
              />
            </Stack.Item>
          )}
        </Stack>
        <DeckCallout
          player={this.state.player}
          isDeckCalloutVisible={this.state.isDeckCalloutVisible}
          onHideCallout={this._hideDeckCallout}
          target={`.DeckCalloutTarget-${this.state.title}`}
        />
      </Stack>
    );
  }
}

export default PlayerContainer;

