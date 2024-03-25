/* React */
import React from "react";

// Fluent UI
import { Spinner, SpinnerSize } from '@fluentui/react';
import { MotionAnimations } from '@fluentui/theme';

// Context
import AppContext from "../classes/AppContext";

// Local Resources
import { IAgentProps } from "../interfaces/IAgentProps";

export const Agent: React.FC<IAgentProps> = (props) => {

  // Context
  const {
    gameStore,
  } = React.useContext(AppContext);

  // State
  const [lastAction, setLastAction] = React.useState<string>('');
  const [spinnerLabel, setSpinnerLabel] = React.useState<string>('Thinking');


  if (props.dealerHasControl) {
    console.log("in agent- dealer has control");
    // Agent acts on a partially random interval
    const intervalInMilliseconds = Math.floor(Math.random() * (new Date().getMilliseconds()))
    const intervalID = setInterval(() => {
      gameStore.evaluateGame(gameStore.gameStatus!);
      const { aceAsEleven, aceAsOne } = props.handValue;

      if (props.gameStatus !== 0) {
        /* when to hit */
        if (aceAsEleven <= 16 || aceAsOne <= 16) {
          setSpinnerLabel("Hit");
          gameStore?.hit(props.playerKey)
        }

        /* when to stay */
        if (
          (aceAsOne >= 17 && aceAsOne <= 21) ||
          (aceAsEleven >= 17 && aceAsEleven <= 21)
        ) {
          setSpinnerLabel("Stay");
          gameStore?.stay(props.playerKey);
        }
      } else {
        setSpinnerLabel("Okay, that's it!");
        clearInterval(intervalID);
      }
    }, intervalInMilliseconds);
  } else {
    console.log("in agent- dealer does not have control");
  }

  return (
    <Spinner
      size={SpinnerSize.large}
      label={spinnerLabel}
      ariaLive="assertive"
      labelPosition="right"
      style={{ animation: MotionAnimations.scaleDownIn }}
    />
  );
}
