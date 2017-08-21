import React, { Component } from "react";
import * as T from "prop-types";

/* custom stuff */
import { BaseComponent } from "./BaseComponent";
import { DeckContainer } from "./DeckContainer";
import { ControlPanel } from "./ControlPanel";

/* flux */
import { GameStore } from "./stores/GameStore";
import { DeckStore } from "./stores/DeckStore";

export class PlayerContainer extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      bank: 1000,
      bet: 0,
      gameStatus: 0,
      hand: [],
      handValue: { aceAsOne: 0, aceAsEleven: 0 },
      id: -1,
      isBusted: false,
      isFinished: false,
      isStaying: false,
      lastAction: "none",
      status: "ok",
      title: "",
      turn: false
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
    this.setState({

    });
  }
  onChangeDeck() {
    const newState = DeckStore.getState();
    this.setState({
      deck: newState.deck,
      selected: newState.selected,
      drawn: newState.drawn,
      playerHands: newState.playerHands
    });
  }

  render() {

    return (
      <div className="playerContainer">
        <ControlPanel 
        playerId={this.props.playerId}
        gameStatus={}
        minimumBet={}
        hidden={false}
        selectedFlag={}
        />

        {this.state.gameStatus >= 0 &&
          <DeckContainer
            deck={}
            gameStatus={}
            handValue={}
            hidden={false}
            isSelectable={true}
            player={}
            title={}
            turnCount={}
          />}
      </div>
    );
  }
}

PlayerContainer.propTypes = {
  playerId: T.object.isRequired,
  gameStatus: T.bool.isRequired
};

export default PlayerContainer;
