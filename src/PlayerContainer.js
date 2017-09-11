import React from "react";
import * as T from "prop-types";
import { Callout, DirectionalHint } from "office-ui-fabric-react/lib/Callout";

/* custom stuff */
import BaseComponent from "./BaseComponent";
import DeckContainer from "./DeckContainer";
import ControlPanel from "./ControlPanel";
import "./PlayerContainer.css";

/* flux */
import { GameStore } from "./stores/GameStore";
import { DeckStore } from "./stores/DeckStore";

export class PlayerContainer extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      deck: [],
      deckCalloutText: "",
      gameStatus: 0,
      gameStatusFlag: true,
      handValue: { aceAsEleven: 0, aceAsOne: 0 },
      id: -1,
      isDeckCalloutEnabled: true,
      isDeckCalloutVisible: false,
      isStatusCalloutVisible: false,
      minimumBet: 0,
      player: { empty: true },
      playerStatusFlag: true,
      selectedFlag: false,
      title: "",
      turnCount: 0
    };

    this._bind(
      "_hideDeckCallout",
      "_setDeckCalloutText",
      "_showDeckCallout",
      "_toggleStatusCallout",
      "onChangeDeck",
      "onChangeGame",
      "_toggleDeckCallout"
    );
  }

  componentWillMount() {
    /* everything else depends on this value being set initially */
    this.setState({ id: this.props.playerId });
  }

  componentDidMount() {
    /* callback when a change emits from GameStore*/
    GameStore.addChangeListener(this.onChangeGame);
    DeckStore.addChangeListener(this.onChangeDeck);
  }

  componentWillUnmount() {
    /* remove change listeners */
    GameStore.removeChangeListener(this.onChangeGame);
    DeckStore.removeChangeListener(this.onChangeDeck);
  }

  /* flux helpegameStatusrs */
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
      deckCalloutText: text,
      gameStatus: newState.gameStatus,
      gameStatusFlag,
      minimumBet: newState.minimumBet,
      player: thisPlayer,
      playerStatusFlag,
      title: thisPlayer.title,
      turnCount: newState.turnCount
    });
  }
  onChangeDeck() {
    /* selectedFlag is true if getSelected() returns an array */
    const selectedFlag = !!DeckStore.getSelected(this.state.id);
    this.setState({
      deck: DeckStore.getHand(this.state.id),
      handValue: DeckStore.getHandValue(this.state.id),
      selectedFlag
    });
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
      <p className="player-titlebar ms-font-xl">
        {`${title} ($${bank})  `}
        <i
          className="ms-Icon ms-Icon--Info"
          onClick={this._toggleStatusCallout}
          ref={calloutTarget => (this._statusCalloutTarget = calloutTarget)}
        />
      </p>
    ) : (
        <span>{title}</span>
      );

    /* style PlayerContainer conditionally */
    let style = "PlayerContainer ";
    if (!this.state.player.empty && this.state.player.turn) {
      style += "selected ";
    }
    if (
      !this.state.player.empty &&
      this.state.player.isStaying &&
      !this.state.player.turn
    ) {
      style += "staying ";
    }

    return (
      <div className={style}>
        {titleBar}
        {this.state.isStatusCalloutVisible && (
          <Callout
            gapSpace={1}
            targetElement={this._statusCalloutTarget}
            onDismiss={this._toggleStatusCallout}
            setInitialFocus={false}
          >
            <StatusDisplay player={this.state.player} />
          </Callout>
        )}
        {this.state.isDeckCalloutEnabled &&
          this.state.isDeckCalloutVisible &&
          this.state.deckCalloutText !== "" && (
            <Callout
              className="DeckCallout"
              gapSpace={1}
              targetElement={this._deckCalloutTarget}
              onDismiss={this._hideDeckCallout}
              setInitialFocus={false}
              directionalHint={DirectionalHint.bottomCenter}
            >
              <span className="ms-font-xl">{this.state.deckCalloutText}</span>
            </Callout>
          )}

        <ControlPanel
          gameStatus={this.state.gameStatus}
          gameStatusFlag={this.state.gameStatusFlag}
          hidden={false}
          minimumBet={this.state.minimumBet}
          player={this.state.player}
          playerId={this.state.id}
          playerStatusFlag={this.state.playerStatusFlag}
          selectedFlag={this.state.selectedFlag}
          showDeckCallout={this._showDeckCallout}
        />

        {this.state.deck.length > 0 && (
          <DeckContainer
            deck={this.state.deck}
            gameStatus={this.state.gameStatus}
            gameStatusFlag={this.gameStatusFlag}
            handValue={this.state.handValue}
            hidden={false}
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

PlayerContainer.propTypes = {
  playerId: T.number.isRequired
};

export default PlayerContainer;

const StatusDisplay = props => {
  return (
    <div id="StatusPanel" className="ms-font-m">
      Status: {props.player.status || ""}
      <br />
      Hand Value:
      {` ${props.player.handValue.aceAsEleven} / ${props.player.handValue
        .aceAsOne}`}
      <br />
      Turn: {`${props.player.turn}`}
      <br />
      isBusted: {`${props.player.isBusted}`}
      <br />
      isStaying: {`${props.player.isStaying}`}
      <br />
      isFinished: {`${props.player.isFinished}`}
      <br />
      lastAction: {`${props.player.lastAction}`}
      <br />
    </div>
  );
};

StatusDisplay.propTypes = {
  player: T.object.isRequired
};
