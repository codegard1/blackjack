/* React */
import React from "react";

// Fluent UI
import { Spinner, SpinnerSize } from '@fluentui/react';
import { MotionAnimations } from '@fluentui/theme';

// Context

// Local Resources
import { DeckContext, DeckDispatchContext, GameContext, GameDispatchContext } from "../ctx";
import { DeckAction, GameAction } from "../enums";
import { IAgentProps } from "../interfaces/IAgentProps";

export const Agent: React.FC<IAgentProps> = (props) => {

  // Context
  const gameState = React.useContext(GameContext);
  const gameDispatch = React.useContext(GameDispatchContext);
  const deck1 = React.useContext(DeckContext);
  const deckDispatch = React.useContext(DeckDispatchContext);

  // State
  const [lastAction, setLastAction] = React.useState<string>('');
  const [spinnerLabel, setSpinnerLabel] = React.useState<string>('Thinking');


  if (props.dealerHasControl) {
    console.log("in agent- dealer has control");
    // Agent acts on a partially random interval
    const intervalInMilliseconds = Math.floor(Math.random() * (new Date().getMilliseconds()))
    const intervalID = setInterval(() => {
      gameDispatch({ type: GameAction.EvaluateGame, gameStatus: gameState.gameStatus });
      const { aceAsEleven, aceAsOne } = props.handValue;

      if (props.gameStatus !== 0) {
        /* when to hit */
        if (aceAsEleven <= 16 || aceAsOne <= 16) {
          setSpinnerLabel("Hit");
          deckDispatch({ type: DeckAction.Draw, playerKey: props.playerKey, numberOfCards: 1 });
        }

        /* when to stay */
        if (
          (aceAsOne >= 17 && aceAsOne <= 21) ||
          (aceAsEleven >= 17 && aceAsEleven <= 21)
        ) {
          setSpinnerLabel("Stay");
          gameDispatch({ type: GameAction.Stay });
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
