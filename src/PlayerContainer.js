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
      deckCalloutText: "I'm Deck Callout!",
      gameStatus: 0,
      handValue: { aceAsEleven: 0, aceAsOne: 0 },
      id: -1,
      isDeckCalloutVisible: false,
      isDeckCalloutEnabled: true,
      isStatusCalloutVisible: false,
      minimumBet: 0,
      player: { empty: true },
      selectedFlag: false,
      title: "",
      turnCount: 0,
      gameStatusFlag: false
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

  /* flux helpers */
  onChangeGame() {
    const newState = GameStore.getState();
    const thisPlayer = newState.players.find(
      player => player.id === this.state.id
    );

    /* when gameStatusFlag is TRUE, most members of blackJackItems are disabled */
    const gameStatusFlag =
      newState.gameStatus === 0 ||
      newState.gameStatus > 2 ||
      thisPlayer.turn === false;

    /* if the player is staying, display callout */
    let text = '';
    if (thisPlayer.isStaying) {
      text = `${thisPlayer.title} stayed`;
    }
    if (thisPlayer.hasBlackJack) {
      text = `${thisPlayer.title} has blackjack`;
    }
    if (thisPlayer.isBusted) {
      text = `${thisPlayer.title} is busted`;
    }
    if (thisPlayer.isFinished) {
      text = `${thisPlayer.title} is finished`;
    }


    this.setState({
      bank: thisPlayer.bank,
      deckCalloutText: text,
      gameStatus: newState.gameStatus,
      gameStatusFlag,
      minimumBet: newState.minimumBet,
      player: thisPlayer,
      title: thisPlayer.title,
      turnCount: newState.turnCount,
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
    const handValue = this.state.handValue;
    const bank = this.state.bank;
    const title = this.state.title;

    const titleBar = !this.state.player.empty
      ? <span>
        {title} {` ($${bank}) `} Hand Value: {handValue.aceAsOne}
        {handValue.aceAsOne !== handValue.aceAsEleven &&
          " / " + handValue.aceAsEleven}{" "}
        <i
          className="ms-Icon ms-Icon--Info"
          onClick={this._toggleStatusCallout}
          ref={calloutTarget => (this._statusCalloutTarget = calloutTarget)}
        />
      </span>
      : <span>
        {title}
      </span>;

    return (
      <div className="PlayerContainer">
        <h3 className="ms-font-s">
          {titleBar}
        </h3>
        {this.state.isStatusCalloutVisible &&
          <Callout
            gapSpace={1}
            targetElement={this._statusCalloutTarget}
            onDismiss={this._toggleStatusCallout}
            setInitialFocus={false}
          >
            <StatusDisplay
              player={this.state.player}
              gameStatus={this.state.gameStatus}
              turnCount={this.state.turnCount}
            />
          </Callout>}
        {this.state.isDeckCalloutEnabled &&
          this.state.isDeckCalloutVisible &&
          this.state.deckCalloutText !== '' &&
          <Callout
            className="DeckCallout"
            gapSpace={1}
            targetElement={this._deckCalloutTarget}
            onDismiss={this._hideDeckCallout}
            setInitialFocus={false}
            directionalHint={DirectionalHint.bottomCenter}
          >
            <span className="ms-font-xl">
              {this.state.deckCalloutText}
            </span>
          </Callout>}

        <ControlPanel
          playerId={this.state.id}
          gameStatus={this.state.gameStatus}
          minimumBet={this.state.minimumBet}
          hidden={false}
          selectedFlag={this.state.selectedFlag}
          player={this.state.player}
          showDeckCallout={this._showDeckCallout}
          gameStatusFlag={this.state.gameStatusFlag}
        />

        {this.state.deck.length > 0 &&
          <DeckContainer
            deck={this.state.deck}
            gameStatus={this.state.gameStatus}
            gameStatusFlag={this.gameStatusFlag}
            handValue={this.state.handValue}
            hidden={false}
            isSelectable={true}
            player={this.state.player}
            title={this.state.title}
            turnCount={this.state.turnCount}
          />}
        <div
          id="deckCalloutTarget"
          ref={callout => (this._deckCalloutTarget = callout)}
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
    <div id="StatusPanel" className="ms-font-s">
      <span>
        Player: {props.player.title || ""}
      </span>
      <br />
      <span>
        Status: {props.player.status || ""}
      </span>
      <br />
      <span>
        Hand Value:{" "}
        {`${props.player.handValue.aceAsEleven} / ${props.player.handValue
          .aceAsOne}`}
      </span>
      <br />
      <span>
        Turn: {`${props.player.turn}`}
      </span>
      <br />
      <span>
        Game Status: {props.gameStatus || 0}
      </span>
      <br />
      <span>
        Turn Count: {props.turnCount || 0}
      </span>
      <br />
    </div>
  );
};

StatusDisplay.propTypes = {
  // gameStatus: T.number.isRequired,
  // turnCount: T.number.isRequired,
  // player: T.object.isRequired
};
