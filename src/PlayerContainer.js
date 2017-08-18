import React, { Component } from "react";
import * as T from "prop-types";
import DeckContainer from "./DeckContainer";
import ControlPanel from "./ControlPanel";

export class PlayerContainer extends Component {
    render() {
        return (
            <div className="playerContainer">
                <ControlPanel
                    player={this.props.player}
                    {...this.props.controlPanelProps}
                />
                {this.props.controlPanelProps.gameStatus >= 0 &&
                    <DeckContainer
                        {...this.props.deckContainerProps}
                        player={this.props.player}
                        turnCount={this.props.turnCount}
                    />}
            </div>
        );
    }
}

PlayerContainer.propTypes = {
    player: T.object.isRequired,
    controlPanelProps: T.object,
    deckContainerProps: T.object,
};

export default PlayerContainer;
