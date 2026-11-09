// React
import React from "react";

import { Badge, Button, Spinner, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

// Local Resources
import {
  ActivityLog, ActivityLogToggle, Agent, BOT_ACTION_DELAY_MS, CardStack, DEALER_ACTION_DELAY_MS, PlayerContainer, SeatChip, TableToasts,
} from ".";
import { useActivityDrawer } from "./ActivityLog";
import { useTableToasts } from "./TableToasts";
import { usePotMotion } from "./usePotMotion";
import { useSeatFlip } from "./useSeatFlip";
import "./Table.css";

// Context
import { PotAnimationContext, useGameContext, useProfileContext, useSettingContext } from '../context';
import { playerDefaults } from "../definitions";
import { GameAction, GameStatus } from "../enums";
import { seatStatus, isRoundOver } from "../functions/seatStatus";
import { decideSeatMove, isDealer, isHuman } from "../functions/round";
import { seatsFor } from "../functions/profiles";
import { IPlayer } from "../interfaces";
import { PlayerHandValue } from "../types";

const EMPTY_HAND_VALUE: PlayerHandValue = { aceAsEleven: 0, aceAsOne: 0, highest: 0 };

const useStyles = makeStyles({
  potBadge: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    minWidth: '180px',
    minHeight: '128px',
    height: 'auto',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow8,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    fontSize: tokens.fontSizeBase500,
    lineHeight: tokens.lineHeightBase500,
  },
  potIcon: {
    fontSize: '48px',
    lineHeight: 1,
  },
});

/**
 * The board. Before the game starts, the selected player and the dealer float as chips
 * on the left, with a button to start. Once it starts, the seat in control expands into
 * the right two thirds, and the other seats collapse into chips on the left. Clicking a
 * chip brings that seat forward. The pot stays in the top-left corner, or the bottom-left
 * corner on a narrow board. The activity log is a drawer that extends from the board's
 * bottom edge, opened from a button in the board's bottom right corner.
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

  // A seat the user chose from the rail. Cleared whenever control moves.
  const [pinnedKey, setPinnedKey] = React.useState<string>();
  React.useEffect(() => setPinnedKey(undefined), [gameState.controllingPlayer, gameStatus]);

  // The seat in control, unless the user has picked another; after a round, the human
  const focusKey = (players.some((player) => player.key === pinnedKey) ? pinnedKey : undefined) ?? gameState.controllingPlayer ?? human?.key;
  const focusPlayer = players.find((player) => player.key === focusKey);
  const railPlayers = players.filter((player) => player !== focusPlayer);

  // Computer autoplay runs here, not in a seat, so it keeps going while that seat is collapsed
  const controller = players.find((player) => player.key === gameState.controllingPlayer);
  const controllerHand = controller ? deck.hand(controller.key, gameState.activeHandIndex) : undefined;

  // Before the game starts, the seats the next game will use: the selected player, the chosen computer players and the dealer
  const seats = seatsFor(profiles);
  const pendingPlayers: IPlayer[] = seats.map((seat) => ({ ...playerDefaults, ...seat, stats: { ...playerDefaults.stats, ...seat.stats } }));
  const startGame = () => gameDispatch({ type: GameAction.NewGame, players: seats });

  // Toasts announce each change; its activity log entries follow once its toasts have faded out.
  // Computer play waits while a toast is queued, so the moves keep pace with the notices.
  const { toasts, activityLog, isBacklogged } = useTableToasts(gameState, revealDealerTotal);
  const activityDrawer = useActivityDrawer();

  // The pot stays in its corner, even after a hand ends. Between hands it slides up out of
  // view and back in; when it grows it shimmers and bounces. Play waits for all of it.
  const potMotion = usePotMotion(pot, round, isStarted);
  const renderPotBadge = (floating = false) => (
    <Badge
      key={potMotion.key}
      size="extra-large"
      appearance="tint"
      color="brand"
      shape="rounded"
      className={mergeClasses(styles.potBadge, 'table-pot-badge', floating && 'is-floating', potMotion.phase !== 'idle' && `is-${potMotion.phase}`)}
    >
      {potMotion.phase === 'bouncing' && <span className="table-pot-shimmer" aria-hidden="true" />}
      <span className={styles.potIcon} aria-hidden="true">💰</span>
      <span>Pot: ${potMotion.shownPot}</span>
    </Badge>
  );

  // Seats that change between the focus column and the rail flow between their positions
  const boardRef = React.useRef<HTMLElement>(null);
  useSeatFlip(boardRef);

  return (
    <PotAnimationContext.Provider value={potMotion.isBusy}>
      <div className="table-shell">
        {/* the board's bottom corners square off while the drawer is attached to them */}
        <main ref={boardRef} className="table-board" style={{ animation: 'table-enter 180ms ease-out', backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground1, borderRadius: activityDrawer.isOpen ? `${tokens.borderRadiusLarge} ${tokens.borderRadiusLarge} 0 0` : tokens.borderRadiusLarge, boxShadow: tokens.shadow16, display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 10px 56px' }}>
          {gameState.isSpinnerVisible && <Spinner size="large" label="Wait, wait..." aria-live="assertive" />}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10 }}>

            {isStarted ? (
              <>
                <div className="table-layout is-started">
                  <div className="table-pot table-pot-corner-slot">
                    {renderPotBadge()}
                  </div>
                  {focusPlayer && (
                    <div key={focusPlayer.key} className="table-focus" data-seat-key={focusPlayer.key} data-seat-role="focus">
                      <PlayerContainer playerKey={focusPlayer.key} />
                    </div>
                  )}

                  <div className="table-rail">
                    {railPlayers.map((player) => {
                      const hand = deck.state.playerHands[player.key];
                      // only the dealer's total waits on the hole card; players' cards are face up
                      const showTotal = settings.isHandValueVisible && !!hand?.cards.length && (!isDealer(player) || revealDealerTotal);
                      return (
                        <div key={player.key} className="table-rail-slot" data-seat-key={player.key} data-seat-role="rail">
                          <SeatChip
                            player={player}
                            status={seatStatus(player, gameStatus)}
                            total={showTotal ? hand.handValue.highest : undefined}
                            cards={hand?.cards}
                            onSelect={() => setPinnedKey(player.key)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="table-layout is-pregame">
                <div className="table-pot table-pot-pregame-slot">
                  {renderPotBadge(true)}
                </div>
                {pendingPlayers.map((player, index) => (
                  <div key={player.key} className="table-pregame-slot" data-seat-key={player.key} data-seat-role="pregame">
                    <SeatChip player={player} floating index={index} />
                  </div>
                ))}
              </div>
            )}

            {!isStarted && (
              <div className="table-start">
                <Button appearance="primary" size="large" onClick={startGame}>Start game</Button>
              </div>
            )}

            {controller?.isNPC && (
              <Agent
                key={controller.key}
                hasControl
                gameStatus={gameStatus}
                handValue={controllerHand?.handValue ?? EMPTY_HAND_VALUE}
                cardCount={controllerHand?.cards.length ?? 0}
                handIndex={gameState.activeHandIndex}
                isPaused={potMotion.isBusy || isBacklogged}
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

          <ActivityLogToggle isOpen={activityDrawer.isOpen} onToggle={activityDrawer.toggle} />
        </main>
        <ActivityLog entries={activityLog} isOpen={activityDrawer.isOpen} />
      </div>
    </PotAnimationContext.Provider>
  );
}
