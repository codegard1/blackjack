import React, { Component } from "react";
import * as T from "prop-types";
import DeckContainer from "./DeckContainer";
import ControlPanel from "./ControlPanel";

export class Player extends Component {
  render() {
    return (
      <div className="player">
        <ControlPanel {...this.props.controlPanelProps} />
        {this.props.controlPanelProps.gameStatus === 1 &&
          <DeckContainer {...this.props.deckContainerProps} />}
      </div>
    );
  }
}

Player.propTypes = {
  controlPanelProps: T.object.isRequired,
  deckContainerProps: T.object.isRequired
};

export default Player;
