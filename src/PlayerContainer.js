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
import ControlPanelStore from "./stores/ControlPanelStore";
import AppActions from './actions/AppActions'

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
      id: -1,
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
      "onChangeGame"
    );
  }
  static propTypes = {
    playerId: T.number.isRequired
  };

  componentWillMount() {
    /* everything else depends on this value being set initially */
    this.setState({ id: this.props.playerId });
  }

  componentDidMount() {
    /* callback when a change emits from GameStore*/
    GameStore.addChangeListener(this.onChangeGame);
    DeckStore.addChangeListener(this.onChangeDeck);
    ControlPanelStore.addChangeListener(this.onChangeControlPanel);
    this.onChangeGame();
    this.onChangeControlPanel();
  }

  componentWillUnmount() {
    /* remove change listeners */
    GameStore.removeChangeListener(this.onChangeGame);
    DeckStore.removeChangeListener(this.onChangeDeck);
    ControlPanelStore.removeChangeListener(this.onChangeControlPanel);
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
  onChangeDeck() {
    /* selectedFlag is true if getSelected() returns an array */
    const selectedFlag = !!DeckStore.getSelected(this.state.id);
    this.setState({
      deck: DeckStore.getHand(this.state.id),
      handValue: DeckStore.getHandValue(this.state.id),
      selectedFlag
    });
  }
  onChangeControlPanel() {
    const newState = ControlPanelStore.getState();
    this.setState({
      isDealerHandVisible: newState.isDealerHandVisible,
      isHandValueVisible: newState.isHandValueVisible,
      isCardDescVisible: newState.isCardDescVisible,
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
        {this.state.isNPC && this.state.dealerHasControl &&
          <Agent {...this.state} />}
        {!this.state.isNPC &&
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
          />}

        {
          this.state.deck.length > 0 && (
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
          )
        }
        <div
          id="deckCalloutTarget"
          ref={callout => (this._deckCalloutTarget = callout)}
          className="ms-font-m"
        />
      </div >
    );
  }
}

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


class Agent extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      lastAction: ''
    }
  }

  componentDidMount() {
    if (this.props.dealerHasControl) {
      console.log('in agent- dealer has control');
      const intervalID = setInterval(() => {

        const aceAsEleven = this.props.handValue.aceAsEleven,
          aceAsOne = this.props.handValue.aceAsOne;

        if (this.props.gameStatus !== 0) {
          /* when to hit */
          if (aceAsEleven <= 16 || aceAsOne <= 16) {
            AppActions.hit(this.props.id);
            console.log('Agent hit');
            this.setState({ lastAction: 'Hit' });
          }

          /* when to stay */
          if ((aceAsOne >= 17 && aceAsOne <= 21) || (aceAsEleven >= 17 && aceAsEleven <= 21)) {
            AppActions.stay();
            console.log('Agent stayed');
            this.setState({ lastAction: 'Stay' });
          }
        } else {
          console.log('Clear intervalID ', intervalID);
          clearInterval(intervalID);
        }
      }, 500);

    } else {
      console.log('in agent- dealer does not have control')
    }
  }

  render() {
    return (
      <div id="Agent" className="ms-slideDownIn10">
        {this.state.lastAction}
      </div>
    )
  }
}