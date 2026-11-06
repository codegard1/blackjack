/* React */
import React from "react";

// Local Resources
import { useGameContext } from "../context";
import { GameAction } from "../enums";
import { IAgentProps } from "../interfaces/IAgentProps";
import { GameStatus } from "../enums";

/** pause before each dealer action, so the seat's move, the card's animation and its toast can play out */
export const DEALER_ACTION_DELAY_MS = 1400;

/**
 * Headless dealer autoplay. Mounted by the Table rather than a seat so the dealer keeps
 * playing even when the dealer's seat is collapsed. Renders nothing.
 */
export const Agent: React.FC<IAgentProps> = (props) => {

  const { gameDispatch } = useGameContext();

  React.useEffect(() => {
    if (props.isPaused || !props.dealerHasControl || props.gameStatus !== GameStatus.InProgress) return;

    const timeoutId = window.setTimeout(() => {
      if (props.handValue.highest < 17) {
        gameDispatch({ type: GameAction.Draw, playerKey: props.playerKey, deckSide: 'top', numberOfCards: 1 });
      } else {
        gameDispatch({ type: GameAction.Stay, playerKey: props.playerKey });
      }
    }, DEALER_ACTION_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [gameDispatch, props.isPaused, props.dealerHasControl, props.gameStatus, props.handValue.highest, props.playerKey]);

  return null;
}
