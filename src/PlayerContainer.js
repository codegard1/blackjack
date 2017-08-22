import React, { Component } from "react";
import * as T from "prop-types";

/* custom stuff */
import { BaseComponent } from "./BaseComponent";
import { DeckContainer } from "./DeckContainer";
import { ControlPanel } from "./ControlPanel";
import './PlayerContainer.css';

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
      minimumBet: 0,
      player: {},
      selectedFlag: false,
      title: "",
      turnCount: 0
    };

    this._bind("onChangeGame", "onChangeDeck");
  }

  componentWillMount() {
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
      gameStatus: newState.gameStatus,
      minimumBet: newState.minimumBet,
      player: thisPlayer,
      title: thisPlayer.title,
      turnCount: newState.turnCount
    });
  }
  onChangeDeck() {
    this.setState({
      deck: DeckStore.getHand(this.state.id),
      handValue: DeckStore.getHandValue(this.state.id),
      selectedFlag: DeckStore.getSelected(this.state.id)
    });
  }

  render() {
    return (
      <div className="PlayerContainer">
        <ControlPanel
          playerId={this.state.id}
          gameStatus={this.state.gameStatus}
          minimumBet={this.state.minimumBet}
          hidden={false}
          selectedFlag={this.state.selectedFlag}
          player={this.state.player}
        />

        {this.state.gameStatus >= 0 &&
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
