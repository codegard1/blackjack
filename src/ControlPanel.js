import React, { Component } from "react";
import * as T from "prop-types";
import { DefaultButton } from "office-ui-fabric-react/lib/Button";

export class ControlPanel extends Component {
  render() {

    const buttons = (
      <div>

        {!this.props.gameStatus &&
          <DefaultButton title="Deal" onClick={this.props.deal}>
            Deal
          </DefaultButton>}

        {this.props.gameStatus &&  
          <DefaultButton
            title="Hit"
            onClick={this.props.hit}
            disabled={this.props.currentPlayer.handValue <= 21 ? true : false}
          >
            Hit
          </DefaultButton>}
        {this.props.gameStatus &&
          <DefaultButton title="Stay" onClick={this.props.stay}>
            Stay
          </DefaultButton>}

        <div>
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
        </div>
      </div>
    );

    const gameStatus = (
      <span>
        Game Status: <strong>{this.props.gameStatus || "N/A"}</strong>
      </span>
    );
    const currentPlayer =
      this.props.currentPlayer &&
      "Current Player: " + this.props.currentPlayer.title;

    return (
      <div id="ControlPanel">
        <div id="button-container">
          <p className="ms-font-l">
            {gameStatus} {currentPlayer}
          </p>
          {buttons}
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
  deal: T.func,
  hit: T.func,
  stay: T.func,
  gameStatus: T.string,
  currentPlayer: T.object
};

export default ControlPanel;
