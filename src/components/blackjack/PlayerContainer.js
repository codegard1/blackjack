import React from "react";
import * as T from "prop-types";
import { Stack, Callout, DirectionalHint, Text } from "@fluentui/react";

/* custom stuff */
import BaseComponent from "../BaseComponent";
import DeckContainer from "./DeckContainer";
import ControlPanel from "./ControlPanel";
import StatusDisplay from "./StatusDisplay";
import Agent from "./Agent";
import "./PlayerContainer.css";

/* flux */
import { GameStore } from "./stores/GameStore";
import { DeckStore } from "./stores/DeckStore";
import StatsStore from "./stores/StatsStore";
import ControlPanelStore from "./stores/ControlPanelStore";

export class PlayerContainer extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      dealerHasControl: false,
      deck: [],
      deckCalloutText: "",
      gameStatus: 0,
      gameStatusFlag: true,
      handValue: { aceAsEleven: 0, aceAsOne: 0 },
      id: this.props.playerId,
      isCardDescVisible: false,
      isDealerHandVisible: true,
      isDeckCalloutEnabled: true,
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
      "_setDeckCalloutText",
      "_showDeckCallout",
      "_toggleDeckCallout",
      "_toggleStatusCallout",
      "onChangeControlPanel",
      "onChangeDeck",
      "onChangeGame",
      "onChangeStats"
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
    this.onChangeGame();
    this.onChangeControlPanel();
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
    const thisPlayer = newState.players.find(
      player => player.id === this.state.id
    );

    /* playerStatusFlag is TRUE when the player cannot play. */
    const playerStatusFlag =
      thisPlayer.isBusted ||
      thisPlayer.isFinished ||
      thisPlayer.isStaying ||
      !thisPlayer.turn;
    /* when gameStatusFlag is TRUE, most members of blackJackItems are disabled */
    const gameStatusFlag = newState.gameStatus === 0 || newState.gameStatus > 2;

    /* if the player is staying, display callout */
    let text = thisPlayer.title;
    if (thisPlayer.isStaying) text += " stayed";
    if (thisPlayer.hasBlackJack) text += " has blackjack";
    if (thisPlayer.isBusted) text += " busted";
    if (thisPlayer.lastAction === "hit") text += " hit";

    this.setState({
      bank: thisPlayer.bank,
      dealerHasControl: newState.dealerHasControl,
      deckCalloutText: text,
      gameStatus: newState.gameStatus,
      gameStatusFlag,
      isNPC: thisPlayer.isNPC,
      minimumBet: newState.minimumBet,
      player: thisPlayer,
      playerStatusFlag,
      title: thisPlayer.title,
      turnCount: newState.turnCount
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
  onChangeStats() {
    const stats = StatsStore.getStats(this.state.id);
    this.setState({ stats });
  }

  _toggleStatusCallout() {
    this.setState({
      isStatusCalloutVisible: !this.state.isStatusCalloutVisible
    });
  }

  _toggleDeckCallout() {
    this.setState({
      isDeckCalloutVisible: !this.state.isDeckCalloutVisible
    });
  }

  _showDeckCallout() {
    if (!this.state.isDeckCalloutVisible) {
      this.setState({ isDeckCalloutVisible: true });
    }
  }

  _hideDeckCallout() {
    this.setState({
      isDeckCalloutVisible: false
    });
  }

  _setDeckCalloutText(text) {
    this.setState({ deckCalloutText: text });
  }

  render() {
    const bank = this.state.bank;
    const title = this.state.title;
    const titleBar = !this.state.player.empty ? (
      <Stack horizontal horizontalAlign="space-between" style={{ padding: '5px' }}>
        <Stack.Item align="start">
          <Text block nowrap variant="large">
            {`${title} ($${bank})  `}
          </Text>
        </Stack.Item>
        <Stack.Item align="center">
          <StatusDisplay
            player={this.state.player}
            stats={this.state.stats}
          />
        </Stack.Item>
      </Stack>
    ) : (
        <Text block nowrap variant="large">{title}</Text>
      );

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
      <div className={playerContainerClass}>
        {titleBar}
        {this.state.isDeckCalloutEnabled &&
          this.state.isDeckCalloutVisible &&
          this.state.deckCalloutText !== "" && (
            <Callout
              className="DeckCallout"
              gapSpace={1}
              target={this._deckCalloutTarget}
              onDismiss={this._hideDeckCallout}
              setInitialFocus={false}
              directionalHint={DirectionalHint.bottomCenter}
            >
              <span className="ms-font-xl">{this.state.deckCalloutText}</span>
            </Callout>
          )}
        {this.state.isNPC &&
          this.state.dealerHasControl && <Agent {...this.state} />}
        {!this.state.isNPC && (
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
        )}

        {this.state.deck.length > 0 && (
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
        )}
        <div
          id="deckCalloutTarget"
          ref={callout => (this._deckCalloutTarget = callout)}
          className="ms-font-m"
        />
      </div>
    );
  }
}

export default PlayerContainer;

