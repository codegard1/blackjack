// React
import React from "react";

import { Badge, Spinner } from '@fluentui/react-components';

// Local Resources
import {
  Agent, CardStack, PlayerContainer, SeatChip, TableToasts,
} from ".";
import { useTableToasts } from "./TableToasts";
import { useSeatFlip } from "./useSeatFlip";
import "./Table.css";

// Context
import { useGameContext, useSettingContext } from '../context';
import { defaultplayersArr } from "../definitions";
import { GameStatus } from "../enums";
import { seatStatus, isRoundOver } from "../functions/seatStatus";
import { IPlayer, ITableProps } from "../interfaces";
import { PlayerHandValue } from "../types";

const EMPTY_HAND_VALUE: PlayerHandValue = { aceAsEleven: 0, aceAsOne: 0, highest: 0 };

/**
 * The board. Before the game starts, the chosen players float as chips on the left.
 * Once it starts, the seat in control expands into the right two thirds, and the
 * other seats collapse into chips on the left. Clicking a chip brings that seat forward.
 */
export const Table: React.FC<ITableProps> = (props) => {

  // Props
  const { pendingPlayerKeys } = props;

  // Context
  const { settings } = useSettingContext();
  const { gameState } = useGameContext();
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

  // Pre-game chips follow the players chosen on the splash screen
  const pendingPlayers = pendingPlayerKeys
    .map((key) => defaultplayersArr.find((player) => player.key === key))
    .filter((player): player is IPlayer => player !== undefined);

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
            {pendingPlayers.length === 0
              ? <div>No players</div>
              : pendingPlayers.map((player, index) => (
                <div key={player.key} className="table-pregame-slot" data-seat-key={player.key} data-seat-role="pregame">
                  <SeatChip player={player} floating index={index} />
                </div>
              ))}
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

        {!settings.isSplashScreenVisible && gameState.deck.length > 0 &&
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
