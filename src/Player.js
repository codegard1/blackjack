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
                        player={this.props.player}
                        gameStatus={this.props.gameStatus}
                        turnCount={this.props.turnCount}
                    />}
            </div>
        );
    }
}

Player.propTypes = {
    player: T.object.isRequired,
    controlPanelProps: T.object,
    deckContainerProps: T.object,
    controlPanelMethods: T.object,
};

export default Player;
