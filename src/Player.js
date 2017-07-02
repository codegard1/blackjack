import React, { Component } from "react";
import * as T from "prop-types";
import DeckContainer from "./DeckContainer";
import ControlPanel from "./ControlPanel";

export class Player extends Component {
  render() {
    return (
      <div className="playerContainer">
        <ControlPanel
          player={this.props.player}
          {...this.props.controlPanelMethods}
          {...this.props.controlPanelProps}
        />
        {this.props.controlPanelProps.gameStatus >= 0 &&
          <DeckContainer
            {...this.props.deckContainerProps}
            {...this.props.deckMethods}
          />}
      </div>
    );
  }
}

/*
DeckContainer.propTypes = {
  deck: T.array,
  title: T.string,
  handValue: T.object,
  select: T.func,
  deselect: T.func,
  hidden: T.bool
}; 

ControlPanel.propTypes = {
  putOnBottomOfDeck: T.func,
  putOnTopOfDeck: T.func,
  drawRandom: T.func,
  drawFromBottomOfDeck: T.func,
  draw: T.func,
  reset: T.func,
  shuffle: T.func,
  deal: T.func,
  hit: T.func,
  stay: T.func,
  resetGame: T.func,
  gameStatus: T.number.isRequired,
  currentPlayer: T.object.isRequired,
  selected: T.array,
  toggleDeckVisibility: T.func,
  toggleSelectedVisibility: T.func,
  toggleDrawnVisibility: T.func,
  isDeckVisible: T.bool,
  isDrawnVisible: T.bool,
  isSelectedVisible: T.bool,
  turnCount: T.number
};*/

Player.propTypes = {
  player: T.object.isRequired,
  controlPanelProps: T.object,
  deckContainerProps: T.object,
  controlPanelMethods: T.object,
  deckMethods: T.object,
};

export default Player;
