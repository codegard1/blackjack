// React
import React from "react";

import {
  Button,
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  Text,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  Add20Regular,
  ArrowClockwise20Regular,
  ArrowForward20Regular,
  ArrowSwap20Regular,
  ArrowUp20Regular,
  ArrowUpload20Regular,
} from '@fluentui/react-icons';

// Local Resources
import { useGameContext, usePlayersDialog, usePotAnimation, useProfileContext } from "../context";
import { GameAction, GameStatus } from "../enums";
import { canDoubleDown, canSplit } from "../functions/gameReducer";
import { seatsFor } from "../functions/profiles";
import { IControlPanelProps } from "../interfaces";

const useStyles = makeStyles({
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusXLarge,
  },
  endActions: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalM,
  },
  button: {
    transitionProperty: 'transform, background-color, color',
    transitionDuration: tokens.durationFast,
    transitionTimingFunction: tokens.curveEasyEase,
    ':active': { transform: 'scale(0.95)' },
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0.01ms' },
  },
});

/**
 * Wraps a control's visible text so the seat's container query can
 * collapse the toolbar to icons on narrow screens. Buttons keep an
 * aria-label (or tooltip label) so their accessible name survives.
 */
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  <span className="seat-control-label">{children}</span>;

// Component
export const ControlPanel: React.FC<IControlPanelProps> = (props) => {

  // Props
  const { playerKey, hidden } = props;
  const styles = useStyles();

  // State from context
  const { gameState, gameDispatch } = useGameContext();
  const openPlayers = usePlayersDialog();
  const { profiles } = useProfileContext();
  const { gameStatus, minimumBet } = gameState;
  const playerStore = gameState.playerStore.state;

  // Computed properties
  const currentPlayerKey = playerStore.currentPlayerKey;
  const player = playerStore.players[props.playerKey];
  const npcFlag = player.isNPC;
  const isRoundComplete = gameStatus >= GameStatus.RoundOver;
  const isBtnDisabled = isRoundComplete || currentPlayerKey !== playerKey;
  // Hit and Stay need a dealt hand; a new game has no cards until the first deal
  const isRoundDealt = Object.values(gameState.deck.state.playerHands).some((hand) => hand.cards.length > 0);
  const isPlayDisabled = isBtnDisabled || !isRoundDealt;
  const isDealDisabled = !isRoundComplete && (currentPlayerKey !== playerKey || isRoundDealt);
  const isDoubleDownDisabled = !canDoubleDown(gameState, playerKey, gameState.activeHandIndex);
  const isSplitDisabled = !canSplit(gameState, playerKey, gameState.activeHandIndex);
  const wagerLabel = `Wager $${minimumBet}`;
  // While the pot animates, enabled controls wait; they stay focusable so keyboard focus is kept
  const isWaiting = usePotAnimation();
  const waitUnless = (isDisabled: boolean) => isWaiting && !isDisabled;
  const hitButton = React.useRef<HTMLButtonElement>(null);
  const nextHandButton = React.useRef<HTMLButtonElement>(null);

  const _hit = () => {
    gameDispatch({ type: GameAction.Draw, playerKey, numberOfCards: 1, deckSide: 'top' });
  }

  const deal = () => {
    gameDispatch({ type: GameAction.Deal });
  };

  // The hand is over, so a roster change made during play takes effect before the next deal
  const nextHand = () => {
    gameDispatch({ type: GameAction.SetRoster, players: seatsFor(profiles) });
    deal();
  };

  React.useEffect(() => {
    if (hidden || npcFlag) return;
    if (isRoundComplete) {
      nextHandButton.current?.focus();
    } else if (isRoundDealt && currentPlayerKey === playerKey) {
      hitButton.current?.focus();
    }
  }, [hidden, npcFlag, isRoundComplete, isRoundDealt, currentPlayerKey, playerKey]);

  React.useEffect(() => {
    if (hidden || npcFlag) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement && (
        target.isContentEditable
        || target.matches('input, textarea, select, [role="textbox"]')
        || (event.key === 'Enter' && target.closest('button, [role="button"]'))
      )) return;

      const key = event.key.toLowerCase();
      const action = key === 'h' && !isPlayDisabled ? _hit
        : key === 's' && !isPlayDisabled ? () => gameDispatch({ type: GameAction.Stay, playerKey })
        : key === 'd' && !isDoubleDownDisabled ? () => gameDispatch({ type: GameAction.DoubleDown, playerKey })
        : key === 'w' && !isBtnDisabled ? () => gameDispatch({ type: GameAction.Bet, playerKey, betAmount: minimumBet })
        : (key === 'enter' || key === 'n') && isRoundComplete ? nextHand
        : (key === 'enter' || key === 'n') && !isDealDisabled ? deal
        : undefined;
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    hidden,
    npcFlag,
    isPlayDisabled,
    isDoubleDownDisabled,
    isBtnDisabled,
    isRoundComplete,
    isDealDisabled,
    minimumBet,
    playerKey,
    profiles,
    gameDispatch,
  ]);

  // Once the hand is over the human gets two choices instead of the action toolbar
  if (!hidden && !npcFlag && isRoundComplete) {
    return (
      <div className={styles.endActions}>
        <Button ref={nextHandButton} appearance="primary" size="large" disabledFocusable={isWaiting} onClick={nextHand}>Next hand</Button>
        <Button appearance="secondary" size="large" onClick={openPlayers}>Change players</Button>
      </div>
    );
  }

  return hidden ? null : (
    <>
      {!npcFlag && !isRoundDealt && !isRoundComplete && currentPlayerKey === playerKey && (
        <Text as="p" size={200}>
          Before dealing, use Wager to add ${minimumBet} to your stake. You can add more than once.
        </Text>
      )}
      <Toolbar aria-label={`${player.title}'s actions`} className={`player-controlpanel ${styles.toolbar}`}>
        <Tooltip content="Draw one card from the top of the deck (H)" relationship="label">
          <ToolbarButton ref={hitButton} className={styles.button} appearance={isPlayDisabled ? 'subtle' : 'primary'} icon={<Add20Regular />} disabled={isPlayDisabled} disabledFocusable={waitUnless(isPlayDisabled)} onClick={_hit}>
            <Label>Hit</Label>
          </ToolbarButton>
        </Tooltip>
        <Tooltip content="Stand on your current hand (S)" relationship="description">
          <ToolbarButton className={styles.button} aria-label="Stay" icon={<ArrowForward20Regular />} disabled={isPlayDisabled} disabledFocusable={waitUnless(isPlayDisabled)} onClick={() => gameDispatch({ type: GameAction.Stay, playerKey })}>
            <Label>Stay</Label>
          </ToolbarButton>
        </Tooltip>
        {!npcFlag && (
          <Tooltip content="Double your stake, take exactly one more card, then stand (D)" relationship="description">
            <ToolbarButton className={styles.button} aria-label="Double Down" icon={<ArrowUpload20Regular />} disabled={isDoubleDownDisabled} disabledFocusable={waitUnless(isDoubleDownDisabled)} onClick={() => gameDispatch({ type: GameAction.DoubleDown, playerKey })}>
              <Label>Double Down</Label>
            </ToolbarButton>
          </Tooltip>
        )}
        {!npcFlag && (
          <Tooltip content="Split a pair into two hands with an equal wager" relationship="description">
            <ToolbarButton className={styles.button} aria-label="Split" icon={<ArrowSwap20Regular />} disabled={isSplitDisabled} disabledFocusable={waitUnless(isSplitDisabled)} onClick={() => gameDispatch({ type: GameAction.Split, playerKey, handIndex: gameState.activeHandIndex })}>
              <Label>Split</Label>
            </ToolbarButton>
          </Tooltip>
        )}
        <Tooltip content={`Add $${minimumBet} to the pot (W)`} relationship="description">
          <ToolbarButton className={styles.button} aria-label={wagerLabel} icon={<ArrowUp20Regular />} disabled={isBtnDisabled} disabledFocusable={waitUnless(isBtnDisabled)} onClick={() => gameDispatch({ type: GameAction.Bet, playerKey, betAmount: minimumBet })}>
            <Label>{wagerLabel}</Label>
          </ToolbarButton>
        </Tooltip>

        <ToolbarDivider />

        {!npcFlag && (
          <Tooltip content="Deal a new round (Enter or N)" relationship="description">
            <ToolbarButton className={styles.button} aria-label="Deal" appearance={isRoundComplete ? 'primary' : 'subtle'} icon={<ArrowClockwise20Regular />} disabled={isDealDisabled} disabledFocusable={waitUnless(isDealDisabled)} onClick={deal}>
              <Label>Deal</Label>
            </ToolbarButton>
          </Tooltip>
        )}
      </Toolbar>
    </>
  );
}
