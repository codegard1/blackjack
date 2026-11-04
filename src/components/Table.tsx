// React
import React from "react";

import { Button, Spinner, Text } from '@fluentui/react-components';
import { Settings24Regular } from '@fluentui/react-icons';

// Local Resources
import {
  CardStack, PlayerContainer,
} from ".";

// Context
import { useGameContext, useSettingContext } from '../context';


export const Table: React.FC = () => {

  // Context
  const { settings, toggleSetting } = useSettingContext();
  const { gameState } = useGameContext();
  const playerStore = gameState.playerStore;


  /**
   * Toggle the Options Panel visibility
   * @returns void
   */
  const toggleOptionsPanel = () => {
    toggleSetting({ key: 'isOptionsPanelVisible', value: !settings.isOptionsPanelVisible });
  }


  // Ad-hod styles for the Table
  return (
    <main style={{ animation: 'table-enter 180ms ease-out', backgroundColor: 'ghostwhite', borderRadius: 6, boxShadow: '0 6px 16px rgba(0, 0, 0, 0.16)', display: 'flex', flexDirection: 'column', gap: 10, padding: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button appearance="subtle" aria-label="Settings" icon={<Settings24Regular />} onClick={toggleOptionsPanel} />
      </div>

      {gameState.isSpinnerVisible && <Spinner size="large" label="Wait, wait..." aria-live="assertive" />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10 }}>

        {!gameState.gameStatusFlag && <Text size={600}>Pot: ${gameState.pot}</Text>}

        <div style={{ alignItems: 'stretch', display: 'flex', flexWrap: 'wrap', gap: 10, padding: 10 }}>

          {null === playerStore || playerStore.length === 0
            ? <div>No players</div>
            : playerStore.all.map(p =>
              <div key={`PlayerStack-${p.key}`} style={{ flex: '1 1 260px' }}>
                <PlayerContainer key={`PlayerContainer-${p.key}`} playerKey={p.key} />
              </div>
            )}
        </div>

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

