import React, { Component } from "react";
import * as T from "prop-types";
import { DefaultButton } from "office-ui-fabric-react/lib/Button";

export class ControlPanel extends Component {
  render() {
    let bustedFlag = false;
    let gameStatus = this.props.gameStatus;
    let currentPlayer = this.props.currentPlayer || undefined;

    // set bustedFlag
    if (currentPlayer) {
      bustedFlag = this.props.currentPlayer.status === "busted" ? true : false;
    }

    const gameStatusDisplay =
      gameStatus &&
      <div>
        <span>
          Game Status: <strong>{gameStatus || "N/A"}</strong>
        </span>
      </div>;

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
            disabled={bustedFlag}
          >
            Hit
          </DefaultButton>}
        {this.props.gameStatus &&
          <DefaultButton
            title="Stay"
            onClick={this.props.stay}
            disabled={bustedFlag}
          >
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

    const currentPlayerDisplay =
      currentPlayer &&
      <div>
        <span>{`Current Player: ${currentPlayer.title}`}</span> <br />
        <span>{`Player Status: ${currentPlayer.status}`}</span>
      </div>;

    return (
      <div id="ControlPanel">
        <div id="button-container">
          <p className="ms-font-l">
            {gameStatusDisplay} <br />
            {currentPlayerDisplay}
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
