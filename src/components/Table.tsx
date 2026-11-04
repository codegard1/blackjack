// React
import React from "react";

import { Badge, Button, Spinner } from '@fluentui/react-components';

// Local Resources
import {
  Agent, CardStack, PlayerContainer, SeatChip, TableToasts,
} from ".";
import { useTableToasts } from "./TableToasts";
import { useSeatFlip } from "./useSeatFlip";
import "./Table.css";

// Context
import { useGameContext, useProfileContext, useSettingContext } from '../context';
import { playerDefaults } from "../definitions";
import { GameAction, GameStatus } from "../enums";
import { seatStatus, isRoundOver } from "../functions/seatStatus";
import { seatsFor } from "../functions/profiles";
import { IPlayer } from "../interfaces";
import { PlayerHandValue } from "../types";

const EMPTY_HAND_VALUE: PlayerHandValue = { aceAsEleven: 0, aceAsOne: 0, highest: 0 };

/**
 * The board. Before the game starts, the selected player and the dealer float as chips
 * on the left, with a button to start. Once it starts, the seat in control expands into
 * the right two thirds, and the other seats collapse into chips on the left. Clicking a
 * chip brings that seat forward.
 */
export const Table: React.FC = () => {

  // Context
  const { settings } = useSettingContext();
  const { gameState, gameDispatch } = useGameContext();
  const { profiles } = useProfileContext();
  const { deck, gameStatus, gameStatusFlag, pot, playerStore } = gameState;
  const players = playerStore.all;
  const human = players.find((player) => !player.isNPC);
  const dealer = players.find((player) => player.isNPC);
  const roundOver = isRoundOver(gameStatus);
  const isStarted = gameStatus !== GameStatus.Init && players.length > 0;
  const revealDealerTotal = !!settings.isDealerHandVisible || roundOver;

  // A seat the user chose from the rail. Cleared whenever control moves.
  const [pinnedKey, setPinnedKey] = React.useState<string>();
  React.useEffect(() => setPinnedKey(undefined), [gameState.controllingPlayer, gameStatus]);

  // The seat in control, unless the user has picked another; after a round, the human
  const focusKey = pinnedKey ?? gameState.controllingPlayer ?? human?.key;
  const focusPlayer = players.find((player) => player.key === focusKey);
  const railPlayers = players.filter((player) => player !== focusPlayer);

  // Dealer autoplay runs here, not in a seat, so it keeps going while its seat is collapsed
  const dealerHandValue = dealer ? deck.state.playerHands[dealer.key]?.handValue : undefined;

  // Before the game starts, the seats the next game will use: the selected player and the dealer
  const seats = seatsFor(profiles);
  const pendingPlayers: IPlayer[] = seats.map((seat) => ({ ...playerDefaults, ...seat, stats: { ...playerDefaults.stats, ...seat.stats } }));
  const startGame = () => gameDispatch({ type: GameAction.NewGame, players: seats });

  const { toasts, dismiss } = useTableToasts(gameState, revealDealerTotal);

  // Seats that change between the focus column and the rail flow between their positions
  const boardRef = React.useRef<HTMLElement>(null);
  useSeatFlip(boardRef);

  return (
    <main ref={boardRef} className="table-board" style={{ animation: 'table-enter 180ms ease-out', backgroundColor: 'ghostwhite', borderRadius: 6, boxShadow: '0 6px 16px rgba(0, 0, 0, 0.16)', display: 'flex', flexDirection: 'column', gap: 10, padding: 10 }}>
      {gameState.isSpinnerVisible && <Spinner size="large" label="Wait, wait..." aria-live="assertive" />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10 }}>

        <div className="table-pot" aria-live="polite">
          {!gameStatusFlag && (
            <Badge size="extra-large" appearance="tint" color="brand" shape="rounded" className="table-pot-badge">
              <span aria-hidden="true">💰</span>&nbsp;Pot: ${pot}
            </Badge>
          )}
        </div>

        {isStarted ? (
          <div className="table-layout is-started">
            {focusPlayer && (
              <div key={focusPlayer.key} className="table-focus" data-seat-key={focusPlayer.key} data-seat-role="focus">
                <PlayerContainer playerKey={focusPlayer.key} />
              </div>
            )}

            <div className="table-rail">
              {railPlayers.map((player) => {
                const hand = deck.state.playerHands[player.key];
                const showTotal = settings.isHandValueVisible && !!hand?.cards.length && (!player.isNPC || revealDealerTotal);
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
        ) : (
          <div className="table-layout is-pregame">
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

        {gameState.dealerHasControl && dealer && (
          <Agent
            dealerHasControl={gameState.dealerHasControl}
            gameStatus={gameStatus}
            handValue={dealerHandValue ?? EMPTY_HAND_VALUE}
            playerKey={dealer.key}
          />
        )}

        <TableToasts toasts={toasts} onDismiss={dismiss} />

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
    </main>
  );
}
