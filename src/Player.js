import React, { Component } from "react";
import * as T from "prop-types";
import DeckContainer from "./DeckContainer";

export class Player extends Component {
    render () {
        return (
            <div class="player">
            I am a Player
            </div>
        );
    }
}

Player.propTypes = {

};

export default Player;
