import React from "react";
import * as T from "prop-types";

export const StatusDisplay = props => {
    return (
        <div id="StatusPanel" className="ms-font-s">
            <span>Player: {props.player.title || ''}</span><br />
            <span>Status: {props.player.status||''}</span><br />
            <span>Hand Value: {`${props.player.handValue.aceAsEleven} / ${props.player.handValue.aceAsOne}`}</span><br />
            <span>Turn: {`${props.player.turn}`}</span><br />
            <span>Game Status: {props.gameStatus || 0}</span><br />
            <span>Turn Count: {props.turnCount || 0}</span><br />
        </div>
    );
};

StatusDisplay.propTypes = {
    gameStatus: T.number.isRequired,
    turnCount: T.number.isRequired,
    player: T.object.isRequired
};

export default StatusDisplay;
