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


// this.setState({
//   dealerHasControl: newState.dealerHasControl,
//   gameStatus: newState.gameStatus,
//   gameStatusFlag,
//   isDeckCalloutVisible: true,
//   minimumBet: newState.minimumBet,
//   turnCount: newState.turnCount,
// });

  
  //     isNPC: thisPlayer.isNPC,
  //     player: thisPlayer,
  //     playerStatusFlag,
  //     title: thisPlayer.title,


export class PlayerContainer extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      deck: [],
      gameStatusFlag: true,
      handValue: { aceAsEleven: 0, aceAsOne: 0 },
      id: PlayerStore.getPlayerId(this.props.playerKey),
      playerKey: this.props.playerKey,
      isHandValueVisible: true,
      isNPC: this.props.player.isNPC,
      isStatusCalloutVisible: false,
      player: PlayerStore.getPlayer(this.props.playerKey),
      playerStatusFlag: (this.props.player.isBusted ||
        this.props.player.isFinished ||
        this.props.player.isStaying ||
        !this.props.player.turn)
      ,
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
      title: this.props.player.title,
    };

    this._bind(
      "_hideDeckCallout",
      "_showDeckCallout",
      "onChangeDeck",
      "onChangeGame",
      "onChangeStats",
      "onChangePlayer"
    );
  }

  static propTypes = {
    playerKey: T.string.isRequired,
    isDealerHandVisible: T.bool.isRequired,
    isHandValueVisible: T.bool.isRequired,
    isCardDescVisible: T.bool.isRequired,
  };

  componentDidMount() {
    /* callback when a change emits from GameStore*/
    DeckStore.addChangeListener(this.onChangeDeck);
    GameStore.addChangeListener(this.onChangeGame);
    StatsStore.addChangeListener(this.onChangeStats);
  }

  componentWillUnmount() {
    /* remove change listeners */
    DeckStore.removeChangeListener(this.onChangeDeck);
    GameStore.removeChangeListener(this.onChangeGame);
    StatsStore.removeChangeListener(this.onChangeStats);
  }

  /**
   * flux helpers
   */

  /* what to do when the game state changes */
  onChangeGame() {
    /* when gameStatusFlag is TRUE, most members of blackJackItems are disabled */
    const gameStatusFlag = this.props.gameStatus === 0 || this.props.gameStatus > 2;
    this.setState({
      gameStatusFlag,
      isDeckCalloutVisible: true,
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

  /* What to do when the player stats change */
  async onChangeStats() {
    const stats = await StatsStore.getStats(this.props.playerKey);
    // Don't update if getStats() returns false
    if (stats) this.setState({ stats });
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
    if (!this.props.player.empty && this.props.player.turn) {
      playerContainerClass += "selected ";
    }
    if (
      !this.props.player.empty &&
      this.props.player.isStaying &&
      !this.props.player.turn
    ) {
      playerContainerClass += "staying ";
    }

    return (
      <Stack verticalAlign className={playerContainerClass}>

        <Stack horizontal horizontalAlign="space-between" style={{ padding: '5px' }} className={`${this.state.title}-titleBar playerContainerClass`}>
          <Stack.Item align="start">
            <Text block nowrap variant="large">
              {`${this.state.title} ($${this.props.player.bank || 0})  `}</Text>
          </Stack.Item>
          <Stack.Item>
            <StatusDisplay player={this.props.player} stats={this.state.stats} />
          </Stack.Item>
        </Stack>

        <Stack verticalAlign horizontalAlign="space-between">
          {this.state.isNPC && this.props.dealerHasControl &&
            <Stack.Item>
              <Agent
                dealerHasControl={this.props.dealerHasControl}
                gameStatus={this.props.gameStatus}
                handvalue={this.state.handValue}
                id={this.state.id}
              />
            </Stack.Item>
          }

          <Stack.Item>
            <ControlPanel
              gameStatus={this.props.gameStatus}
              gameStatusFlag={this.props.gameStatusFlag}
              hidden={!this.state.isNPC}
              minimumBet={this.props.minimumBet}
              player={this.props.player}
              playerId={this.state.id}
              playerKey={this.props.playerKey}
              playerStatusFlag={this.state.playerStatusFlag}
              playerIsNPC={this.state.isNPC}
              selectedFlag={this.state.selectedFlag}
              showDeckCallout={this._showDeckCallout}
            />
          </Stack.Item>

          <Stack.Item className={`DeckCalloutTarget-${this.state.title}`}>
            <DeckContainer
              deck={this.state.deck}
              gameStatus={this.props.gameStatus}
              gameStatusFlag={this.gameStatusFlag}
              handValue={this.state.handValue}
              hidden={!(this.state.deck.length > 0)}
              isCardDescVisible={this.props.isCardDescVisible}
              isDealerHandVisible={this.props.isDealerHandVisible}
              isHandValueVisible={this.props.isHandValueVisible}
              isNPC={this.state.isNPC}
              isPlayerDeck
              isSelectable
              player={this.props.player}
              title={this.state.title}
              turnCount={this.props.turnCount}
            />
          </Stack.Item>
        </Stack>
        <DeckCallout
          player={this.props.player}
          isDeckCalloutVisible={this.state.isDeckCalloutVisible}
          onHideCallout={this._hideDeckCallout}
          target={`.DeckCalloutTarget-${this.state.title}`}
        />
      </Stack>
    );
  }
}

export default PlayerContainer;

