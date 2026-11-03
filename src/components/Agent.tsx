/* React */
import React from "react";

import { Spinner } from '@fluentui/react-components';

// Local Resources
import { useGameContext } from "../context";
import { GameAction } from "../enums";
import { IAgentProps } from "../interfaces/IAgentProps";
import { GameStatus } from "../enums";

export const Agent: React.FC<IAgentProps> = (props) => {

  const { gameDispatch } = useGameContext();

  // State
  const [spinnerLabel, setSpinnerLabel] = React.useState<string>('Thinking');

  React.useEffect(() => {
    if (!props.dealerHasControl || props.gameStatus !== GameStatus.InProgress) return;

    const timeoutId = window.setTimeout(() => {
      if (props.handValue.highest < 17) {
        setSpinnerLabel('Hit');
        gameDispatch({ type: GameAction.Draw, playerKey: props.playerKey, deckSide: 'top', numberOfCards: 1 });
      } else {
        setSpinnerLabel('Stay');
        gameDispatch({ type: GameAction.Stay, playerKey: props.playerKey });
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [gameDispatch, props.dealerHasControl, props.gameStatus, props.handValue.highest, props.playerKey]);

  return (
    <Spinner size="large" label={spinnerLabel} aria-live="assertive" />
  );
}
