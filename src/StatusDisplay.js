import React from "react";
import * as T from "prop-types";

export const StatusDisplay = props => {
    return (
        <div id="StatusPanel" className="ms-font-s">
            <span>Player: {props.player.title}</span><br />
            <span>Status: {props.player.status}</span><br />
            <span>Hand Value: {`${props.player.handValue.aceAsTen} / ${props.player.handValue.aceAsOne}`}</span><br />
            <span>Turn: {props.player.turn || 'false'}</span><br />
            <span>Game Status: {props.gameStatus || 0}</span><br />
            <span>Turn Count: {props.turnCount || 0}</span><br />
        </div>
    );
};

StatusDisplay.propTypes = {
    gameStatus: T.number,
    turnCount: T.number,
    player: T.object
};

export default StatusDisplay;
