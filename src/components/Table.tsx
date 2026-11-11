// React
import React from "react";

import { Badge, Button, Spinner, Text, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

// Local Resources
import {
  ActivityLog, ActivityLogToggle, Agent, BOT_ACTION_DELAY_MS, CardStack, ControlPanel, DEALER_ACTION_DELAY_MS, PlayerContainer, SeatChip, TableToasts,
} from ".";
import { useActivityDrawer } from "./ActivityLog";
import { useTableToasts } from "./TableToasts";
import { useCardFlip } from "./useCardFlip";
import { usePotMotion } from "./usePotMotion";
import { useSeatFlip } from "./useSeatFlip";
import "./Table.css";

// Context
import { PotAnimationContext, useGameContext, useProfileContext, useSettingContext } from '../context';
import { playerDefaults } from "../definitions";
import { GameAction, GameStatus } from "../enums";
import { seatStatus, isHoleCardHidden, isRoundOver } from "../functions/seatStatus";
import { decideSeatMove, isDealer, isHuman, seatOrder } from "../functions/round";
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
  zoneLabel: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  dockStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground3,
  },
});

/**
 * The board. Players queue at the side in turn order as chips (the left by default; the
 * Seat queue side setting moves them right), and the dealer waits on its bench above the
 * stage. The seat in control moves to the stage and expands; clicking a chip brings that
 * seat forward instead. During a hand the queue is a conveyor: seats still to play lead it
 * and seats that have played collect behind. On a narrow board everything is one column:
 * the queue, then the dealer, then the stage. Before a game the chips float in place.
 * The dock is one row along the board's bottom edge: the pot, then the game's buttons
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

  // The seat in control, unless the user has picked another; after a round, the human
  const dealer = players.find(isDealer);
  const turnKey = (players.some((player) => player.key === pinnedKey) ? pinnedKey : undefined) ?? gameState.controllingPlayer ?? human?.key;

  // The dealer's hole card turns over when the round ends, as control passes back to the human.
  // The dealer's seat keeps the stage until the card has turned, so the flip is seen at full size.
  const holeCardKey = dealer ? deck.hand(dealer.key)?.cards[0] : undefined;
  const holeCardFlip = useCardFlip(holeCardKey, isHoleCardHidden(dealer, !!settings.isDealerHandVisible, gameStatus), !!dealer && turnKey === dealer.key);
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

  // Seats wait at the side in turn order, and the dealer waits on its bench above the stage;
  // the focused seat has left for the stage. During a hand the queue moves like a conveyor:
  // the seats still to play lead it and the seats that have played collect behind them.
  const tablePlayers = isStarted ? players : pendingPlayers;
  const queueSeats = tablePlayers.filter((player) => !isDealer(player) && player !== focusPlayer);
  const benchDealer = tablePlayers.find((player) => isDealer(player) && player !== focusPlayer);
  const turnOrder = isStarted ? seatOrder(gameState) : [];
  const controlIndex = gameStatus === GameStatus.InProgress && controller ? turnOrder.indexOf(controller.key) : -1;
  const hasPlayed = (player: IPlayer) => turnOrder.indexOf(player.key) < controlIndex;
  const queueGroups = (controlIndex < 0
    ? [{ label: 'Turn order', seats: queueSeats }]
    : [
      { label: 'Up next', seats: queueSeats.filter((player) => !hasPlayed(player)) },
      { label: 'Played', seats: queueSeats.filter(hasPlayed) },
    ]).filter((group) => group.seats.length > 0);

  // A collapsed seat. During a game its chip brings the seat forward; before one it floats.
  const renderChip = (player: IPlayer, role: 'queue' | 'bench', index: number) => {
    const hand = isStarted ? deck.state.playerHands[player.key] : undefined;
    // only the dealer's total waits on the hole card; players' cards are face up
    const showTotal = settings.isHandValueVisible && !!hand?.cards.length && (!isDealer(player) || revealDealerTotal);
    return (
      <div key={player.key} className="table-seat-slot" data-seat-key={player.key} data-seat-role={role}>
        {isStarted ? (
          <SeatChip
            player={player}
            status={seatStatus(player, gameStatus)}
            total={showTotal ? hand.handValue.highest : undefined}
            cards={hand?.cards}
            onSelect={() => setPinnedKey(player.key)}
          />
        ) : (
          <SeatChip player={player} floating index={index} />
        )}
      </div>
    );
  };

  const startGame = () => gameDispatch({ type: GameAction.NewGame, players: seats, tableRules: tableRulesFrom(settings) });

  // Toasts announce each change; its activity log entries follow once its toasts have faded out.
  // Computer play waits while a toast is queued, so the moves keep pace with the notices.
  const { toasts, activityLog, isBacklogged } = useTableToasts(gameState, revealDealerTotal);
  const activityDrawer = useActivityDrawer();

  // The pot stays at the start of the dock, even after a hand ends. Between hands it slides
  // up out of view and back in; when it grows it shimmers and bounces. Play waits for all of it.
  const potMotion = usePotMotion(pot, round, isStarted);
  const potBadge = (
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
  );

  // Seats flow between the queue, the dealer's bench and the stage, and slide when the queue moves up
  const boardRef = React.useRef<HTMLElement>(null);
  useSeatFlip(boardRef);

  return (
    <PotAnimationContext.Provider value={potMotion.isBusy || holeCardFlip.isBusy}>
      <div className="table-shell">
        {/* the board's bottom corners square off while the drawer is attached to them */}
        <main ref={boardRef} className="table-board" style={{ animation: 'table-enter 180ms ease-out', backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground1, borderRadius: activityDrawer.isOpen ? `${tokens.borderRadiusLarge} ${tokens.borderRadiusLarge} 0 0` : tokens.borderRadiusLarge, boxShadow: tokens.shadow16, display: 'flex', flexDirection: 'column' }}>
          {gameState.isSpinnerVisible && <Spinner size="large" label="Wait, wait..." aria-live="polite" />}

          <div className="table-field">

            <div className={mergeClasses('table-layout', isStarted ? 'is-started' : 'is-pregame', settings.queueSide === 'right' && 'is-queue-right')}>
              <div className="table-queue" role="group" aria-label="Seats in turn order">
                {queueGroups.map((group) => (
                  <React.Fragment key={group.label}>
                    <Text className={mergeClasses('table-zone-label', styles.zoneLabel)}>{group.label}</Text>
                    {group.seats.map((player) => renderChip(player, 'queue', tablePlayers.indexOf(player)))}
                  </React.Fragment>
                ))}
              </div>

              {benchDealer && (
                <div className="table-bench" role="group" aria-label="Dealer">
                  <Text className={mergeClasses('table-zone-label', styles.zoneLabel)}>Dealer</Text>
                  {renderChip(benchDealer, 'bench', tablePlayers.indexOf(benchDealer))}
                </div>
              )}

              {focusPlayer && (
                <div key={focusPlayer.key} className="table-focus" data-seat-key={focusPlayer.key} data-seat-role="focus">
                  <PlayerContainer playerKey={focusPlayer.key} />
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

            <TableToasts toasts={toasts} />

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

          <div className={mergeClasses('table-dock', styles.dock)}>
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
