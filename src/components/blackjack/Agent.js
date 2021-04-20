/* React */
import React from "react";
import * as T from "prop-types";
import { Spinner, SpinnerSize } from '@fluentui/react';
import { MotionAnimations } from '@fluentui/theme';


/* Flux */
import AppActions from "./actions/AppActions";


class Agent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      lastAction: "",
      spinnerLabel: "Thinking",
    };
  }

  static propTypes = {
    dealerHasControl: T.bool.isRequired,
    gameStatus: T.number.isRequired,
    handValue: T.object.isRequired,
    playerKey: T.string.isRequired,
  }

  componentDidMount() {
    if (this.props.dealerHasControl) {
      console.log("in agent- dealer has control");
      // Agent acts on a partially random interval
      const intervalInMilliseconds = Math.floor(Math.random() * (new Date().getMilliseconds()))
      const intervalID = setInterval(() => {
        AppActions.evaluateGame(this.props.gameStatus);
        const { aceAsEleven, aceAsOne } = this.props.handValue;
        debugger;
        if (this.props.gameStatus !== 0) {
          /* when to hit */
          if (aceAsEleven <= 16 || aceAsOne <= 16) {
            this.setState({ spinnerLabel: "Hit" },
            AppActions.hit(this.props.playerKey));
          }

          /* when to stay */
          if (
            (aceAsOne >= 17 && aceAsOne <= 21) ||
            (aceAsEleven >= 17 && aceAsEleven <= 21)
          ) {
            this.setState({ spinnerLabel: "Stay" },
            AppActions.stay(this.props.playerKey));
          }
        } else {
          console.log("Clear intervalID ", intervalID);
          this.setState({spinnerLabel:"Okay, that's it!"})
          clearInterval(intervalID);
        }
      }, intervalInMilliseconds);
    } else {
      console.log("in agent- dealer does not have control");
    }
  }

  render() {
    return (
        <Spinner
          size={SpinnerSize.large}
          label={this.state.spinnerLabel}
          ariaLive="assertive"
          labelPosition="right"
          style={{ animation: MotionAnimations.scaleDownIn }}
        />
    );
  }
}

export default Agent;
