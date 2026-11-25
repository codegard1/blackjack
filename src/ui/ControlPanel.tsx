// React
import React from "react";

import {
  Button,
  Text,
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
  ArrowSwap20Regular,
  ArrowUp20Regular,
  ArrowUpload20Regular,
} from '@fluentui/react-icons';

// Local Resources
import { useGameContext } from "../game/GameContext";
import { usePlayersDialog } from "./PlayersDialogContext";
import { usePotAnimation } from "./PotAnimationContext";
import { useProfileContext } from "../game/ProfileContext";
import { useSettingContext } from "../game/SettingContext";
import { GameAction, GameStatus } from "../../shared";
import { BotMove } from "../game/botStrategy";
import { canDoubleDown, canInsurance, canSplit, canSurrender, maxInsuranceBet } from "../game/gameReducer";
import { getPlayerHand } from "../game/deck";
import { allPlayers } from "../game/playerStore";
import { botAccountsFor, seatsFor } from "../game/profiles";
import { getDealer, isBot } from "../game/round";
import { recommendMove } from "../game/strategyHint";
import { tableRulesFrom } from "../../shared";

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
  // with a hint, the line that explains it sits over the toolbar, inside the dock
  hinted: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalXXS,
    minWidth: 0,
    maxWidth: '100%',
  },
  hint: {
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: tokens.colorBrandForeground1,
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
 * Wraps a control's visible text so the dock's container query can
 * collapse the toolbar to icons when it is short of room. Buttons keep an
 * aria-label (or tooltip label) so their accessible name survives.
 */
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  <span className="seat-control-label">{children}</span>;

/**
 * The human's game buttons, shown in the Table's dock: the action toolbar during a hand,
 * or Next hand and Change players once the hand is over
 */
export const ControlPanel: React.FC<IControlPanelProps> = (props) => {

  // Props
  const { playerKey, hidden } = props;
  const styles = useStyles();

  // State from context
  const { gameState, gameDispatch } = useGameContext();
  const openPlayers = usePlayersDialog();
  const { profiles } = useProfileContext();
  const { settings } = useSettingContext();
  const { gameStatus, minimumBet } = gameState;
  const playerStore = gameState.playerStore;

  // Computed properties
  const currentPlayerKey = playerStore.currentPlayerKey;
  const player = playerStore.players[props.playerKey];
  const npcFlag = player.isNPC;
  const isRoundComplete = gameStatus >= GameStatus.RoundOver;
  const isBtnDisabled = isRoundComplete || currentPlayerKey !== playerKey;
  // Hit and Stay need a dealt hand; a new game has no cards until the first deal
  const isRoundDealt = Object.values(gameState.deck.playerHands).some((hand) => hand.cards.length > 0);
  const isPlayDisabled = isBtnDisabled || !isRoundDealt;
  const isDealDisabled = !isRoundComplete && (currentPlayerKey !== playerKey || isRoundDealt);
  const isDoubleDownDisabled = !canDoubleDown(gameState, playerKey, gameState.activeHandIndex);
  const isSplitDisabled = !canSplit(gameState, playerKey, gameState.activeHandIndex);
  const isSurrenderDisabled = !canSurrender(gameState, playerKey, gameState.activeHandIndex);
  const isInsurancePending = canInsurance(gameState, playerKey);
  const insuranceAmount = isInsurancePending ? maxInsuranceBet(gameState, playerKey) : 0;
  const wagerLabel = `Wager $${minimumBet}`;

  // The textbook play for the hand in control, when hints are switched on and there is a move
  // to make. It reads the dealer's face-up card only: the hole card is dealt first.
  const dealer = getDealer(gameState);
  const hint = settings.isStrategyHintVisible && !npcFlag && !isPlayDisabled && !isInsurancePending
    ? recommendMove({
      cards: getPlayerHand(gameState.deck, playerKey, gameState.activeHandIndex)?.cards ?? [],
      dealerUpCard: dealer ? getPlayerHand(gameState.deck, dealer.key)?.cards[1] : undefined,
      canDouble: !isDoubleDownDisabled,
      canSplit: !isSplitDisabled,
      canSurrender: !isSurrenderDisabled,
      dealerSoft17: gameState.tableRules.dealerSoft17,
      numberOfDecks: gameState.tableRules.numberOfDecks,
      doubleAfterSplit: gameState.tableRules.doubleAfterSplit,
    })
    : undefined;
  // The filled button is the one to press: the hinted move, or Hit when there is no hint
  const emphasis = (move: BotMove): 'primary' | 'subtle' | undefined => {
    if (hint) return hint.move === move ? 'primary' : 'subtle';
    if (move !== 'hit') return undefined;
    return isPlayDisabled ? 'subtle' : 'primary';
  };
  const hinted = (move: BotMove) => (hint?.move === move ? { 'data-hint': 'true' } : {});
  // While the pot animates, enabled controls wait; they stay focusable so keyboard focus is kept
  const isWaiting = usePotAnimation();
  const waitUnless = (isDisabled: boolean) => isWaiting && !isDisabled;
  const hitButton = React.useRef<HTMLButtonElement>(null);
  const nextHandButton = React.useRef<HTMLButtonElement>(null);

  const _hit = () => {
    gameDispatch({ type: GameAction.Draw, playerKey, numberOfCards: 1, deckSide: 'top' });
  }

  const deal = () => {
    gameDispatch({ type: GameAction.Deal, tableRules: tableRulesFrom(settings) });
  };

  const isSittingOut = !!player?.isSittingOut;
  const hasAvailableBots = allPlayers(gameState.playerStore).some(
    (p) => isBot(p) && !p.isSittingOut && p.bank >= minimumBet
  );
  const canSitOut = hasAvailableBots;

  // The hand is over, so a roster change made during play takes effect before the next deal
  const nextHand = () => {
    gameDispatch({ type: GameAction.SetRoster, players: seatsFor(profiles), botAccounts: botAccountsFor(profiles) });
    gameDispatch({ type: GameAction.SitOut, playerKey, isSittingOut: false });
    deal();
  };

  const sitOut = () => {
    gameDispatch({ type: GameAction.SetRoster, players: seatsFor(profiles), botAccounts: botAccountsFor(profiles) });
    gameDispatch({ type: GameAction.SitOut, playerKey, isSittingOut: true });
    deal();
  };

  const rejoinTable = () => {
    gameDispatch({ type: GameAction.SetRoster, players: seatsFor(profiles), botAccounts: botAccountsFor(profiles) });
    gameDispatch({ type: GameAction.SitOut, playerKey, isSittingOut: false });
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
        : (key === 'enter' || key === 'n') && isRoundComplete ? (isSittingOut ? rejoinTable : nextHand)
        : key === 'o' && isRoundComplete && canSitOut ? sitOut
        : (key === 'enter' || key === 'n') && !isDealDisabled ? deal
        : undefined;
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // no dependency list: the handlers above are made anew on every render, so the listener is too
  });

  // When the dealer shows an ace and insurance is enabled, offer the side bet before checking for a natural
  if (!hidden && !npcFlag && isInsurancePending) {
    const humanHasNatural = getPlayerHand(gameState.deck, playerKey, 0)?.handValue.highest === 21;
    return (
      <div className={`player-endactions ${styles.endActions}`} role="group" aria-label="Insurance">
        <Button appearance="primary" size="large" onClick={() => gameDispatch({ type: GameAction.Insurance, playerKey, accept: true, amount: insuranceAmount })}>
          {humanHasNatural ? `Even money ($${insuranceAmount})` : `Take insurance ($${insuranceAmount})`}
        </Button>
        <Button appearance="secondary" size="large" onClick={() => gameDispatch({ type: GameAction.Insurance, playerKey, accept: false })}>
          No insurance
        </Button>
      </div>
    );
  }

  // Once the hand is over the human gets choices instead of the action toolbar
  if (!hidden && !npcFlag && isRoundComplete) {
    return (
      <div className={`player-endactions ${styles.endActions}`}>
        {isSittingOut ? (
          <>
            <Tooltip content="Rejoin the table and resume play (Enter or N)" relationship="description">
              <Button ref={nextHandButton} appearance="primary" size="large" disabledFocusable={isWaiting} onClick={rejoinTable}>
                Rejoin table
              </Button>
            </Tooltip>
            <Tooltip
              content={!canSitOut ? "No computer players available to play" : "Sit out another hand while computer players play (O)"}
              relationship="description"
            >
              <Button appearance="secondary" size="large" disabledFocusable={isWaiting} disabled={!canSitOut} onClick={sitOut}>
                Sit out another hand
              </Button>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip content="Deal a new round (Enter or N)" relationship="description">
              <Button ref={nextHandButton} appearance="primary" size="large" disabledFocusable={isWaiting} onClick={nextHand}>
                Next hand
              </Button>
            </Tooltip>
            <Tooltip
              content={!canSitOut ? "No computer players available to play" : "Sit out the next hand while computer players play (O)"}
              relationship="description"
            >
              <Button appearance="secondary" size="large" disabledFocusable={isWaiting} disabled={!canSitOut} onClick={sitOut}>
                Sit out
              </Button>
            </Tooltip>
          </>
        )}
        <Button appearance="secondary" size="large" onClick={openPlayers}>Change players</Button>
      </div>
    );
  }

  const toolbar = (
      <Toolbar aria-label={`${player.title}'s actions`} className={`player-controlpanel ${styles.toolbar}`}>
        <Tooltip content="Draw one card from the top of the deck (H)" relationship="label">
          <ToolbarButton ref={hitButton} className={styles.button} appearance={emphasis('hit')} {...hinted('hit')} icon={<Add20Regular />} disabled={isPlayDisabled} disabledFocusable={waitUnless(isPlayDisabled)} onClick={_hit}>
            <Label>Hit</Label>
          </ToolbarButton>
        </Tooltip>
        <Tooltip content="Stand on your current hand (S)" relationship="description">
          <ToolbarButton className={styles.button} aria-label="Stay" appearance={emphasis('stay')} {...hinted('stay')} icon={<ArrowForward20Regular />} disabled={isPlayDisabled} disabledFocusable={waitUnless(isPlayDisabled)} onClick={() => gameDispatch({ type: GameAction.Stay, playerKey })}>
            <Label>Stay</Label>
          </ToolbarButton>
        </Tooltip>
        {!npcFlag && (
          <Tooltip content="Double your stake, take exactly one more card, then stand (D)" relationship="description">
            <ToolbarButton className={styles.button} aria-label="Double Down" appearance={emphasis('double')} {...hinted('double')} icon={<ArrowUpload20Regular />} disabled={isDoubleDownDisabled} disabledFocusable={waitUnless(isDoubleDownDisabled)} onClick={() => gameDispatch({ type: GameAction.DoubleDown, playerKey })}>
              <Label>Double Down</Label>
            </ToolbarButton>
          </Tooltip>
        )}
        {!npcFlag && (
          <Tooltip content="Split a pair into two hands with an equal wager" relationship="description">
            <ToolbarButton className={styles.button} aria-label="Split" appearance={emphasis('split')} {...hinted('split')} icon={<ArrowSwap20Regular />} disabled={isSplitDisabled} disabledFocusable={waitUnless(isSplitDisabled)} onClick={() => gameDispatch({ type: GameAction.Split, playerKey, handIndex: gameState.activeHandIndex })}>
              <Label>Split</Label>
            </ToolbarButton>
          </Tooltip>
        )}
        {!npcFlag && gameState.tableRules.surrender && (
          <Tooltip content="Forfeit half your stake and end this hand" relationship="description">
            <ToolbarButton className={styles.button} aria-label="Surrender" appearance={emphasis('surrender')} {...hinted('surrender')} disabled={isSurrenderDisabled} disabledFocusable={waitUnless(isSurrenderDisabled)} onClick={() => gameDispatch({ type: GameAction.Surrender, playerKey, handIndex: gameState.activeHandIndex })}>
              <Label>Surrender</Label>
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
  );

  if (hidden) return null;
  // without a hint the toolbar stands alone, exactly as it does when hints are switched off
  return hint ? (
    <div className={`player-hinted ${styles.hinted}`}>
      <Text size={200} weight="semibold" role="status" className={`strategy-hint ${styles.hint}`}>Hint: {hint.reason}</Text>
      {toolbar}
    </div>
  ) : toolbar;
}


export interface IControlPanelProps {
  /** the human seat the controls act for */
  playerKey: string,
  hidden?: boolean;
}
