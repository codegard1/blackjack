import React from "react";
import * as T from "prop-types";
import { Callout } from "office-ui-fabric-react/lib/Callout";

/* custom stuff */
import BaseComponent from "./BaseComponent";
import DeckContainer from "./DeckContainer";
import ControlPanel from "./ControlPanel";
import StatusDisplay from "./StatusDisplay";
import "./PlayerContainer.css";

/* flux */
import { GameStore } from "./stores/GameStore";
import { DeckStore } from "./stores/DeckStore";

export class PlayerContainer extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      deck: [],
      gameStatus: 0,
      handValue: { aceAsEleven: 0, aceAsOne: 0 },
      id: -1,
      isStatusCalloutVisible: false,
      minimumBet: 0,
      player: { empty: true },
      selectedFlag: false,
      title: "",
      turnCount: 0
    };

    this._bind("onChangeGame", "onChangeDeck", "_toggleStatusCallout");
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

    this.setState({
      bank: thisPlayer.bank,
      gameStatus: newState.gameStatus,
      minimumBet: newState.minimumBet,
      player: thisPlayer,
      title: thisPlayer.title,
      turnCount: newState.turnCount
    });
  }
  onChangeDeck() {
    const selectedFlag = !!DeckStore.getSelected(this.state.id);
    console.log(`selectedFlag: ${selectedFlag}`);
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

        <ControlPanel
          playerId={this.state.id}
          gameStatus={this.state.gameStatus}
          minimumBet={this.state.minimumBet}
          hidden={false}
          selectedFlag={this.state.selectedFlag}
          player={this.state.player}
        />

        {this.state.gameStatus > 0 &&
          this.state.deck &&
          <DeckContainer
            deck={this.state.deck}
            gameStatus={this.state.gameStatus}
            handValue={this.state.handValue}
            hidden={false}
            isSelectable={true}
            player={this.state.player}
            title={this.state.title}
            turnCount={this.state.turnCount}
          />}
      </div>
    );
  }
}

PlayerContainer.propTypes = {
  playerId: T.number.isRequired
};

export default PlayerContainer;
