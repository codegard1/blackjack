/* React */
import React from "react";

// Fluent UI
import { Spinner, SpinnerSize } from '@fluentui/react';
import { MotionAnimations } from '@fluentui/theme';


// Context
// import AppActions from "./actions/AppActions";
import AppContext from "../classes/AppContext";

export interface IAgentProps {
  dealerHasControl: Boolean;
  gameStatus: Number;
  handValue: any;
  playerKey: string;
}

export const Agent: React.FC<IAgentProps> = (props) => {

  // Context
  const {

  } = React.useContext(AppContext);

  // State
  const [lastAction, setLastAction] = React.useState < string > ('');
  const [spinnerLabel, setSpinnerLabel] = React.useState < string > ('Thinking');


  if (this.props.dealerHasControl) {
    console.log("in agent- dealer has control");
    // Agent acts on a partially random interval
    const intervalInMilliseconds = Math.floor(Math.random() * (new Date().getMilliseconds()))
    const intervalID = setInterval(() => {
      AppActions.evaluateGame(this.props.gameStatus);
      const { aceAsEleven, aceAsOne } = this.props.handValue;

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
        this.setState({ spinnerLabel: "Okay, that's it!" },
          clearInterval(intervalID))
      }
    }, intervalInMilliseconds);
  } else {
    console.log("in agent- dealer does not have control");
  }

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
