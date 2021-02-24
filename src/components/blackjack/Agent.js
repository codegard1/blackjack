/* React */
import React from "react";
import * as T from "prop-types";
import { Text } from '@fluentui/react';

/* Flux */
import AppActions from "./actions/AppActions";

class Agent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      lastAction: ""
    };
  }

  static propTypes = {
    dealerHasControl: T.bool.isRequired,
    gameStatus: T.number.isRequired,
    handvalue: T.object.isRequired,
    playerKey: T.string.isRequired,
  }

  componentDidMount() {
    if (this.props.dealerHasControl) {
      console.log("in agent- dealer has control");
      // Agent acts on a 500 ms interval
      const intervalID = setInterval(() => {
        const { aceAsEleven, aceAsOne } = this.props.handValue;

        if (this.props.gameStatus !== 0) {
          /* when to hit */
          if (aceAsEleven <= 16 || aceAsOne <= 16) {
            AppActions.hit(this.props.playerKey);
            console.log("Agent hit");
            this.setState({ lastAction: "Hit" });
          }

          /* when to stay */
          if (
            (aceAsOne >= 17 && aceAsOne <= 21) ||
            (aceAsEleven >= 17 && aceAsEleven <= 21)
          ) {
            // console.log("Agent stayed");
            AppActions.stay(this.props.id);
            this.setState({ lastAction: "Stay" });
          }
        } else {
          // console.log("Clear intervalID ", intervalID);
          clearInterval(intervalID);
        }
      }, 500);
    } else {
      console.log("in agent- dealer does not have control");
    }
  }

  render() {
    return (
      <div>
        <Text block nowrap variant="large">{this.state.lastAction}</Text>
      </div>
    );
  }
}

export default Agent;
