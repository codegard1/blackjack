import React from "react";
import * as T from "prop-types";

export const StatusDisplay = props => {
  const gameStatusDisplay = (
    <span className="ms-font-s" style={{ float: "left" }}>
      Game Status: <strong>{props.gameStatus}</strong>
      <br />
      Turn Count: {props.turnCount}
    </span>
  );

  const currentPlayerDisplay = (
    <p className="ms-font-s">
      <span>{`Player: ${props.player.title}`}</span> <br />
      <span>{`Status: ${props.player.status}`}</span><br />
      <span
      >{`Hand Value: ${props.player.handValue.aceAsTen} / ${props.player.handValue.aceAsOne}`}</span>
      <br />
      <span>{`Turn: ${props.player.turn}`}</span><br />
    </p>
  );

  return (
    <div id="StatusPanel">
      {gameStatusDisplay}
      <br /><br />
      {currentPlayerDisplay}
    </div>
  );
};

StatusDisplay.propTypes = {
  gameStatus: T.number,
  turnCount: T.number,
  player: T.object
};

export default StatusDisplay;
