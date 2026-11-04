// React
import React from "react";

import {
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  Add20Regular,
  ArrowClockwise20Regular,
  ArrowForward20Regular,
  ArrowUp20Regular,
  ArrowUpload20Regular,
} from '@fluentui/react-icons';

// Local Resources
import { useGameContext, useSettingContext } from "../context";
import { GameAction, GameStatus } from "../enums";
import { canDoubleDown } from "../functions/gameReducer";
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
  const { toggleSetting } = useSettingContext();
  const { gameStatus, minimumBet } = gameState;
  const playerStore = gameState.playerStore.state;

  // Computed properties
  const currentPlayerKey = playerStore.currentPlayerKey;
  const player = playerStore.players[props.playerKey];
  const npcFlag = player.isNPC;
  const isRoundComplete = gameStatus >= GameStatus.HumanWins;
  const isBtnDisabled = isRoundComplete || currentPlayerKey !== playerKey;
  const isDealDisabled = !isRoundComplete && currentPlayerKey !== playerKey;
  const isDoubleDownDisabled = !canDoubleDown(gameState, playerKey);
  const wagerLabel = `Wager $${minimumBet}`;

  const _hit = () => {
    toggleSetting({ key: 'isMessageBarVisible', value: true });
    gameDispatch({ type: GameAction.Draw, playerKey, numberOfCards: 1, deckSide: 'top' });
  }

  const deal = () => {
    gameDispatch({ type: GameAction.Deal });
    toggleSetting({ key: 'isMessageBarVisible', value: true });
    gameDispatch({
      type: GameAction.ShowMessageBar,
      messageBarDefinition: { text: 'New Round', type: 'info', isMultiLine: false },
    });
  };

  return hidden ? null : (
    <Toolbar aria-label={`${player.title}'s actions`} className={`player-controlpanel ${styles.toolbar}`}>
      <Tooltip content="Draw one card from the top of the deck" relationship="label">
        <ToolbarButton className={styles.button} appearance={isBtnDisabled ? 'subtle' : 'primary'} icon={<Add20Regular />} disabled={isBtnDisabled} onClick={_hit}>
          <Label>Hit</Label>
        </ToolbarButton>
      </Tooltip>
      <Tooltip content="Stand on your current hand" relationship="description">
        <ToolbarButton className={styles.button} aria-label="Stay" icon={<ArrowForward20Regular />} disabled={isBtnDisabled} onClick={() => gameDispatch({ type: GameAction.Stay, playerKey })}>
          <Label>Stay</Label>
        </ToolbarButton>
      </Tooltip>
      {!npcFlag && (
        <Tooltip content="Double your stake, take exactly one more card, then stand" relationship="description">
          <ToolbarButton className={styles.button} aria-label="Double Down" icon={<ArrowUpload20Regular />} disabled={isDoubleDownDisabled} onClick={() => gameDispatch({ type: GameAction.DoubleDown, playerKey })}>
            <Label>Double Down</Label>
          </ToolbarButton>
        </Tooltip>
      )}
      <Tooltip content={`Add $${minimumBet} to the pot`} relationship="description">
        <ToolbarButton className={styles.button} aria-label={wagerLabel} icon={<ArrowUp20Regular />} disabled={isBtnDisabled} onClick={() => gameDispatch({ type: GameAction.Bet, playerKey, betAmount: minimumBet })}>
          <Label>{wagerLabel}</Label>
        </ToolbarButton>
      </Tooltip>

      <ToolbarDivider />

      {!npcFlag && (
        <Tooltip content="Deal a new round" relationship="description">
          <ToolbarButton className={styles.button} aria-label="Deal" appearance={isRoundComplete ? 'primary' : 'subtle'} icon={<ArrowClockwise20Regular />} disabled={isDealDisabled} onClick={deal}>
            <Label>Deal</Label>
          </ToolbarButton>
        </Tooltip>
      )}
    </Toolbar>
  );
}
