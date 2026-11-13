// React
import React from "react";

import { Badge, Button, Spinner, Text, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

// Local Resources
import {
  ActivityLog, ActivityLogToggle, Agent, BOT_ACTION_DELAY_MS, CardStack, ControlPanel, DEALER_ACTION_DELAY_MS, PlayerContainer, SeatChip, TableToasts,
} from ".";
import { useActivityDrawer } from "./ActivityLog";
import { isPotToast, useTableToasts } from "./TableToasts";
import { useCardFlip } from "./useCardFlip";
import { usePotBreakdown } from "./usePotBreakdown";
import { usePotMotion } from "./usePotMotion";
import { useSeatFlip } from "./useSeatFlip";
import "./Table.css";

// Context
import { PotAnimationContext, useGameContext, useProfileContext, useSettingContext } from '../context';
import { playerDefaults } from "../definitions";
import { GameAction, GameStatus } from "../enums";
import { seatTag, isHoleCardHidden, isRoundOver } from "../functions/seatStatus";
import { decideSeatMove, isDealer, isHuman, seatOrder, seatQueues } from "../functions/round";
import { potBreakdown } from "../functions/pot";
import { seatsFor } from "../functions/profiles";
import { IPlayer } from "../interfaces";
import { PlayerHandValue, tableRulesFrom } from "../types";

const EMPTY_HAND_VALUE: PlayerHandValue = { aceAsEleven: 0, aceAsOne: 0, highest: 0 };

const useStyles = makeStyles({
  potBadge: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    height: 'auto',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    whiteSpace: 'nowrap',
  },
  potIcon: {
    fontSize: tokens.fontSizeBase500,
    lineHeight: 1,
  },
  dock: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  dockStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground3,
  },
});

/**
 * The board. Seats that are not on the stage wait as chips, in the reverse of turn order: the
 * dealer, who plays last, at the top and the human, who plays first, at the bottom. Seats still
 * to play wait above the stage, the next to play closest to it; the seat in control moves to the
 * stage and expands, and when its turn is over it moves down to just below the stage, so the
 * first to play ends at the bottom. Clicking a chip brings that seat forward instead. On a wide
 * board the chips are a column at the side (the left by default; the Seat queue side setting
 * moves it right), the waiting seats at its top and the seats that have played at its bottom.
 * On a narrow board everything is one column: the waiting seats, the stage, then the seats that
 * have played. Before a game the chips float in place, with the dealer's tag naming it.
 * The dock is one row along the board's bottom edge: the pot (a button; tapping it lists what
 * each player has put in, over the pot), then the game's buttons
 * (Start game, the human's actions, or who is playing during a computer's turn), then the
 * button that opens the activity log, a drawer that extends from the board's bottom edge.
 */
export const Table: React.FC = () => {

  // Context
  const { settings } = useSettingContext();
  const { gameState, gameDispatch } = useGameContext();
  const { profiles } = useProfileContext();
  const styles = useStyles();
  const { deck, gameStatus, pot, playerStore, round } = gameState;
  const players = playerStore.all;
  const human = players.find(isHuman);
  const roundOver = isRoundOver(gameStatus);
  const isStarted = gameStatus !== GameStatus.Init && players.length > 0;
  const revealDealerTotal = !!settings.isDealerHandVisible || roundOver;

  // A seat the user chose from the queue or the bench. Cleared whenever control moves.
  const [pinnedKey, setPinnedKey] = React.useState<string>();
  React.useEffect(() => setPinnedKey(undefined), [gameState.controllingPlayer, gameStatus]);

  // The seat in control, unless the user has picked another; before the deal, the human. Once the round
  // is over nobody has the stage: every seat is a chip, and each is brought into focus as its result is told.
  const dealer = players.find(isDealer);
  const turnKey = (players.some((player) => player.key === pinnedKey) ? pinnedKey : undefined) ?? gameState.controllingPlayer ?? (roundOver ? undefined : human?.key);

  // The dealer's hole card turns over when the round ends, and the stage empties.
  // The dealer's seat keeps the stage until the card has turned and the pause after it is over, so the flip and the hand are seen at full size.
  const holeCardKey = dealer ? deck.hand(dealer.key)?.cards[0] : undefined;
  const holeCardFlip = useCardFlip(holeCardKey, isHoleCardHidden(dealer, !!settings.isDealerHandVisible, gameStatus), !!dealer && turnKey === dealer.key, roundOver);
  const focusKey = holeCardFlip.holdsFocus ? dealer?.key : turnKey;
  const focusPlayer = isStarted ? players.find((player) => player.key === focusKey) : undefined;

  // Computer autoplay runs here, not in a seat, so it keeps going while that seat is collapsed
  const controller = players.find((player) => player.key === gameState.controllingPlayer);
  const controllerHand = controller ? deck.hand(controller.key, gameState.activeHandIndex) : undefined;
  // while a computer seat plays, the dock names it in place of the human's buttons
  const isComputerTurn = !!controller?.isNPC && gameStatus === GameStatus.InProgress;

  // Before the game starts, the seats the next game will use: the selected player, the chosen computer players and the dealer
  const seats = seatsFor(profiles);
  const pendingPlayers: IPlayer[] = seats.map((seat) => ({ ...playerDefaults, ...seat, stats: { ...playerDefaults.stats, ...seat.stats } }));

  // The seats off the stage wait in the reverse of turn order, the dealer first: those still to play
  // above the stage, the next to play closest to it, and those that have played below it
  const tablePlayers = isStarted ? players : pendingPlayers;
  const turnOrder = isStarted
    ? seatOrder(gameState)
    : [...tablePlayers.filter((player) => !isDealer(player)), ...tablePlayers.filter(isDealer)].map((player) => player.key);
  // a dealer that was waiting when the round ended stays up there until its hole card has turned over, so the flip is seen
  const isTurning = holeCardFlip.isBusy && !holeCardFlip.holdsFocus && gameStatus >= GameStatus.RoundOver ? dealer?.key : undefined;
  const queues = seatQueues(turnOrder, focusPlayer?.key, controller?.key, gameStatus >= GameStatus.RoundOver, isTurning);
  const seatsOf = (keys: string[]) => keys.flatMap((key) => tablePlayers.find((player) => player.key === key) ?? []);
  const waitingSeats = seatsOf(queues.waiting);
  const playedSeats = seatsOf(queues.played);

  // A collapsed seat. During a game its chip brings the seat forward; before one it floats.
  const renderChip = (player: IPlayer, role: 'waiting' | 'played', index: number) => {
    const hand = isStarted ? deck.state.playerHands[player.key] : undefined;
    // only the dealer's total waits on the hole card; players' cards are face up
    const showTotal = settings.isHandValueVisible && !!hand?.cards.length && (!isDealer(player) || revealDealerTotal);
    return (
      <div key={player.key} className="table-seat-slot" data-seat-key={player.key} data-seat-role={role}>
        {isStarted ? (
          <SeatChip
            player={player}
            status={seatTag(player, gameStatus)}
            total={showTotal ? hand.handValue.highest : undefined}
            cards={hand?.cards}
            focus={toastFocus?.key === player.key ? toastFocus.tone : undefined}
            onSelect={() => setPinnedKey(player.key)}
          />
        ) : (
          <SeatChip player={player} status={seatTag(player, gameStatus)} floating index={index} />
        )}
      </div>
    );
  };

  const startGame = () => gameDispatch({ type: GameAction.NewGame, players: seats, tableRules: tableRulesFrom(settings) });

  // Toasts announce each change; its activity log entries follow once its toasts have had their moment.
  // Computer play waits while a toast is queued, so the moves keep pace with the notices. At the end of
  // a round each seat's result is a toast of its own, after the dealer's card has turned, and the seat's
  // chip is in focus meanwhile; the game's buttons wait until the last result has been told.
  const { toasts, activityLog, isBacklogged, focus: toastFocus, isAnnouncingResults } = useTableToasts(
    gameState,
    revealDealerTotal,
    holeCardFlip.isBusy ? holeCardFlip.waitMs : 0,
  );
  // money going into the pot is told over the pot; everything else in the feed above the middle of the dock
  const potToasts = toasts.filter(isPotToast);
  const tableToasts = toasts.filter((toast) => !isPotToast(toast));
  // tapping the pot lists what each player has put in, in the pot's feed; the contribution toasts wait behind it
  const potShares = React.useMemo(() => potBreakdown(gameState), [gameState]);
  const breakdown = usePotBreakdown(potShares, round);
  const hasBreakdown = breakdown.lines.length > 0;
  const potLines = hasBreakdown ? breakdown.lines : potToasts;
  const activityDrawer = useActivityDrawer();

  // The pot stays at the start of the dock, even after a hand ends. Between hands it slides
  // up out of view and back in; when it grows it shimmers and bounces. Play waits for all of it.
  const potMotion = usePotMotion(pot, round, isStarted);
  const potBadge = (
    <button type="button" className="table-pot-button" aria-expanded={breakdown.isOpen} title="Show what each player has put in" onClick={breakdown.toggle}>
      <Badge
        key={potMotion.key}
        size="extra-large"
        appearance="tint"
        color="brand"
        shape="rounded"
        className={mergeClasses(styles.potBadge, 'table-pot-badge', potMotion.phase !== 'idle' && `is-${potMotion.phase}`)}
      >
        {potMotion.phase === 'bouncing' && <span className="table-pot-shimmer" aria-hidden="true" />}
        <span className={mergeClasses('table-pot-icon', styles.potIcon)} aria-hidden="true">💰</span>
        <span>Pot: ${potMotion.shownPot}</span>
      </Badge>
    </button>
  );

  // Seats flow between the waiting seats above the stage, the stage and the played seats below it, and slide when a seat joins those below
  const boardRef = React.useRef<HTMLElement>(null);
  useSeatFlip(boardRef);

  return (
    <PotAnimationContext.Provider value={potMotion.isBusy || holeCardFlip.isBusy || isAnnouncingResults}>
      <div className="table-shell">
        {/* the board's bottom corners square off while the drawer is attached to them */}
        <main ref={boardRef} className="table-board" style={{ animation: 'table-enter 180ms ease-out', backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground1, borderRadius: activityDrawer.isOpen ? `${tokens.borderRadiusLarge} ${tokens.borderRadiusLarge} 0 0` : tokens.borderRadiusLarge, boxShadow: tokens.shadow16, display: 'flex', flexDirection: 'column' }}>
          {gameState.isSpinnerVisible && <Spinner size="large" label="Wait, wait..." aria-live="polite" />}

          <div className="table-field">

            <div className={mergeClasses('table-layout', isStarted ? 'is-started' : 'is-pregame', !focusPlayer && 'is-stageless', settings.queueSide === 'right' && 'is-queue-right')}>
              {waitingSeats.length > 0 && (
                <div className="table-waiting" role="group" aria-label="Seats still to play, the dealer first">
                  {waitingSeats.map((player) => renderChip(player, 'waiting', tablePlayers.indexOf(player)))}
                </div>
              )}

              {focusPlayer && (
                <div key={focusPlayer.key} className="table-focus" data-seat-key={focusPlayer.key} data-seat-role="focus">
                  <PlayerContainer playerKey={focusPlayer.key} />
                </div>
              )}

              {playedSeats.length > 0 && (
                <div className="table-played" role="group" aria-label="Seats that have played, the latest first">
                  {playedSeats.map((player) => renderChip(player, 'played', tablePlayers.indexOf(player)))}
                </div>
              )}
            </div>

            {controller?.isNPC && (
              <Agent
                key={controller.key}
                hasControl
                gameStatus={gameStatus}
                handValue={controllerHand?.handValue ?? EMPTY_HAND_VALUE}
                cardCount={controllerHand?.cards.length ?? 0}
                handIndex={gameState.activeHandIndex}
                isPaused={potMotion.isBusy || holeCardFlip.isBusy || isBacklogged}
                playerKey={controller.key}
                decide={() => decideSeatMove(gameState, controller.key, Math.random, gameState.activeHandIndex)}
                delayMs={isDealer(controller) ? DEALER_ACTION_DELAY_MS : BOT_ACTION_DELAY_MS}
              />
            )}

            {gameState.deck.length > 0 &&
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10 }}>
                  <CardStack
                    cards={gameState.deck.cardKeys}
                    title="Deck"
                    hidden={!settings.isDeckVisible}
                    isSelectable={false}
                  />
                  <CardStack
                    cards={gameState.deck.drawnKeys}
                    title="Drawn Cards"
                    hidden={!settings.isDrawnVisible}
                    isSelectable={false}
                  />
                  <CardStack
                    cards={gameState.deck.selectedKeys}
                    title="Selected Cards"
                    hidden={!settings.isSelectedVisible}
                    isSelectable={false}
                  />
              </div>
            }
          </div>

          <div className={mergeClasses('table-dock', styles.dock, potLines.length > 0 && 'has-pot-toast')} style={{ '--pot-lines': potLines.length } as React.CSSProperties}>
            {/* the notices run just above the dock, beside the buttons, wherever a tall board is scrolled to */}
            <TableToasts toasts={tableToasts} />
            <TableToasts toasts={potLines} placement="pot" isFlat={hasBreakdown} />
            <div className="table-pot">{potBadge}</div>
            <div className="table-dock-actions">
              {!isStarted ? (
                <Button appearance="primary" size="large" onClick={startGame}>Start game</Button>
              ) : isComputerTurn ? (
                <Text className={mergeClasses('table-dock-status', styles.dockStatus)}>
                  <Spinner size="tiny" aria-hidden="true" />
                  {`${controller.title} is playing`}
                </Text>
              ) : human && (
                <ControlPanel playerKey={human.key} />
              )}
            </div>
            <ActivityLogToggle isOpen={activityDrawer.isOpen} onToggle={activityDrawer.toggle} />
          </div>
        </main>
        <ActivityLog entries={activityLog} isOpen={activityDrawer.isOpen} />
      </div>
    </PotAnimationContext.Provider>
  );
}
