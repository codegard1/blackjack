import React, { Component } from "react";
import * as T from "prop-types";
import { DefaultButton } from "office-ui-fabric-react/lib/Button";

export class ControlPanel extends Component {
  render() {
    return (
      <div id="ControlPanel">
        <div id="button-container">
          <DefaultButton onClick={this.props.shuffle}>
            Shuffle
          </DefaultButton>
          <DefaultButton onClick={this.props.reset}>
            Reset
          </DefaultButton>
          <DefaultButton onClick={this.props.draw}>
            Draw
          </DefaultButton>
          <DefaultButton onClick={this.props.drawFromBottomOfDeck}>
            Draw from Bottom of Deck
          </DefaultButton>
          <DefaultButton onClick={this.props.drawRandom}>
            Draw Random
          </DefaultButton>
          <DefaultButton onClick={this.props.putOnTopOfDeck}>
            Put on Top of Deck
          </DefaultButton>
          <DefaultButton onClick={this.props.putOnBottomOfDeck}>
            Put on Bottom of Deck
          </DefaultButton>
          <DefaultButton onClick={this.props.deal}>
            Deal
          </DefaultButton>
          <DefaultButton onClick={this.props.hit}>
            Hit
            </DefaultButton>
        </div>
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
  shuffle: T.func,
  deal: T.func
};

export default ControlPanel;
