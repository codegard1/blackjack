// React
import React from "react";

import { Badge, Spinner } from '@fluentui/react-components';

// Local Resources
import {
  CardStack, PlayerContainer,
} from ".";

// Context
import { useGameContext, useSettingContext } from '../context';


export const Table: React.FC = () => {

  // Context
  const { settings } = useSettingContext();
  const { gameState } = useGameContext();
  const playerStore = gameState.playerStore;


  // Ad-hod styles for the Table
  return (
    <main style={{ animation: 'table-enter 180ms ease-out', backgroundColor: 'ghostwhite', borderRadius: 6, boxShadow: '0 6px 16px rgba(0, 0, 0, 0.16)', display: 'flex', flexDirection: 'column', gap: 10, padding: 10 }}>
      {gameState.isSpinnerVisible && <Spinner size="large" label="Wait, wait..." aria-live="assertive" />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10 }}>

        {null === playerStore || playerStore.length === 0
          ? <div>No players</div>
          : (
            <div className="table-layout">
              <div className="table-seats table-seats-dealer">
                {playerStore.all.filter((p) => p.isNPC).map((p) =>
                  <PlayerContainer key={`PlayerContainer-${p.key}`} playerKey={p.key} />
                )}
              </div>

              <div className="table-pot" aria-live="polite">
                {!gameState.gameStatusFlag && (
                  <Badge size="extra-large" appearance="tint" color="brand" shape="rounded" className="table-pot-badge">
                    <span aria-hidden="true">💰</span>&nbsp;Pot: ${gameState.pot}
                  </Badge>
                )}
              </div>

              <div className="table-seats table-seats-player">
                {playerStore.all.filter((p) => !p.isNPC).map((p) =>
                  <PlayerContainer key={`PlayerContainer-${p.key}`} playerKey={p.key} />
                )}
              </div>
            </div>
          )}

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

