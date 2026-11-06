/* React */
import React from "react";

// Local Resources
import { useGameContext } from "../context";
import { GameAction, GameStatus } from "../enums";
import { IAgentProps } from "../interfaces/IAgentProps";

/** pause before each dealer action, so the seat's move, the card's animation and its toast can play out */
export const DEALER_ACTION_DELAY_MS = 1400;

/** pause before each computer player's action; a little quicker, as there can be four of them */
export const BOT_ACTION_DELAY_MS = 1000;

/**
 * Headless autoplay for the computer seat in control: the dealer or a computer
 * character. Mounted by the Table rather than a seat so it keeps playing while
 * that seat is collapsed. Schedules one move per decision point. Renders nothing.
 */
export const Agent: React.FC<IAgentProps> = (props) => {

  const { gameDispatch } = useGameContext();
  const { hasControl, gameStatus, handValue, cardCount, playerKey, delayMs = DEALER_ACTION_DELAY_MS, isPaused = false } = props;

  // the latest decision function, read when the delay is up, so a re-render does not reschedule
  const decide = React.useRef(props.decide);
  decide.current = props.decide;

  React.useEffect(() => {
    if (isPaused || !hasControl || gameStatus !== GameStatus.InProgress) return;

    const timeoutId = window.setTimeout(() => {
      const move = decide.current ? decide.current() : handValue.highest < 17 ? 'hit' : 'stay';
      if (move === 'hit') {
        gameDispatch({ type: GameAction.Draw, playerKey, deckSide: 'top', numberOfCards: 1 });
      } else if (move === 'double') {
        gameDispatch({ type: GameAction.DoubleDown, playerKey });
      } else {
        gameDispatch({ type: GameAction.Stay, playerKey });
      }
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [gameDispatch, isPaused, hasControl, gameStatus, handValue.highest, cardCount, playerKey, delayMs]);

  return null;
}
