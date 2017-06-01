import React, { Component } from "react";
import * as T from "prop-types";
import { DefaultButton } from "office-ui-fabric-react/lib/Button";

export class ControlPanel extends Component {
  render() {
    return (
      <div id="ControlPanel">
        <DefaultButton onClick={this.props.shuffle}>
          Shuffle
        </DefaultButton>
        <DefaultButton onClick={this.props.reset}>
          Reset
        </DefaultButton>
        <DefaultButton onClick={this.props.draw}>
          draw
        </DefaultButton>
        <DefaultButton onClick={this.props.drawFromBottomOfDeck}>
          drawFromBottomOfDeck
        </DefaultButton>
        <DefaultButton onClick={this.props.drawRandom}>
          drawRandom
        </DefaultButton>
        <DefaultButton onClick={this.props.putOnTopOfDeck}>
          putOnTopOfDeck
        </DefaultButton>
        <DefaultButton onClick={this.props.putOnBottomOfDeck}>
          putOnBottomOfDeck
        </DefaultButton>
      </div>
    );
  }
}

ControlPanel.propTypes = {
  putOnBottomOfDeck: T.func,
  putOnTopOfDeck: T.func,
  drawRandom: T.func,
  drawFromBottomOfDeck: T.func,
  draw: T.func,
  reset: T.func,
  shuffle: T.func
};

export default ControlPanel;
