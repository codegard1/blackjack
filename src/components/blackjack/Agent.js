/* React */
import React from "react";
import * as T from "prop-types";
import { Text, mergeStyleSets } from '@fluentui/react';
import { MotionAnimations } from '@fluentui/theme';

/* Flux */
import AppActions from "./actions/AppActions";

/* custom stuff */
import BaseComponent from "../BaseComponent";

// CSS Styles
const classNames = mergeStyleSets({
  divRoot: {
    animation: MotionAnimations.fadeIn,
  }
});


class Agent extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      lastAction: ""
    };
  }

  static propTypes = {
    dealerHasControl: T.bool.isRequired,
    gameStatus: T.number.isRequired,
    handvalue: T.object,
    id: T.number.isRequired,
  }

  componentDidMount() {
    if (this.props.dealerHasControl) {
      console.log("in agent- dealer has control");
      // Agent acts on a 500 ms interval
      const intervalID = setInterval(() => {
        const aceAsEleven = this.props.handValue.aceAsEleven,
          aceAsOne = this.props.handValue.aceAsOne;

        if (this.props.gameStatus !== 0) {
          /* when to hit */
          if (aceAsEleven <= 16 || aceAsOne <= 16) {
            AppActions.hit(this.props.id);
            console.log("Agent hit");
            this.setState({ lastAction: "Hit" });
          }

          /* when to stay */
          if (
            (aceAsOne >= 17 && aceAsOne <= 21) ||
            (aceAsEleven >= 17 && aceAsEleven <= 21)
          ) {
            console.log("Agent stayed");
            debugger;
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
      <div className={classNames.divRoot}>
        <Text block nowrap variant="large">{this.state.lastAction}</Text>
      </div>
    );
  }
}

export default Agent;