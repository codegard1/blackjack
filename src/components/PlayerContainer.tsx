// React
import React from "react";

import { Text } from '@fluentui/react-components';

/* custom stuff */
import { Agent, CardStack, ControlPanel, DeckCallout, StatusDisplay } from '.';
import { IPlayerContainerProps } from "../interfaces";

// Styles
import "./PlayerContainer.css";

// Context
import { PlayingCard } from "../classes";
import { useGameContext } from "../context";

// Component
export const PlayerContainer: React.FC<IPlayerContainerProps> = (props) => {

  // Props
  const { playerKey } = props;

  // Context
  const { gameState } = useGameContext();

  // computed values
  const playerState = gameState.playerStore.state;
  const player = playerState.players[playerKey];
  const playerStatusFlag = (player.isBusted ||
    player.isFinished ||
    player.isStaying ||
    !player.turn);
  const deckState = gameState.deck.state;
  const playerHand = deckState.playerHands[playerKey] ?? {
    cards: [],
    handValue: { aceAsEleven: 0, aceAsOne: 0, highest: 0 },
  };
  const { cards, handValue } = playerHand;

  const id = `DeckCalloutTarget-${player.title}`;

  // State
  const [isStatusCalloutVisible, setStatusCalloutVisible] = React.useState<boolean>(false);
  const [isDeckCalloutVisible, setDeckCalloutVisible] = React.useState<boolean>(false);

  // shorthand methods to show and hide the deck callout
  const _showDeckCallout = () => setDeckCalloutVisible(true);
  const _hideDeckCallout = () => setDeckCalloutVisible(false);
  const _showStatusCallout = () => setStatusCalloutVisible(true);
  const _hideStatusCallout = () => setStatusCalloutVisible(false);

  // Styles
  let playerContainerClass = "PlayerContainer ";
  if (player.turn) {
    playerContainerClass += "selected ";
  }
  if (
    player.isStaying &&
    !player.turn
  ) {
    playerContainerClass += "staying ";
  }

  /* selectedFlag is true if getSelected() returns an array */
  // const selectedFlag = !!DeckStore.getSelected(playerKey);
  const selectedFlag = false;

  React.useEffect(() => {
    console.log('gameState effect');
  }, [gameState]);

  return (
    <section className={playerContainerClass}>
      <header style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', padding: 5 }}>
        <Text size={500}>{`${player.title} ($${player.bank || 0})`}</Text>
        <StatusDisplay player={player} stats={player.stats} />
      </header>

      <div style={{ alignItems: 'flex-start', display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', padding: 5 }}>
        {player.isNPC && gameState.dealerHasControl &&
          <div>
            <Agent
              dealerHasControl={gameState.dealerHasControl}
              gameStatus={gameState.gameStatus}
              handValue={handValue}
              playerKey={playerKey}
            />
          </div>
        }

        <div>
          <ControlPanel
            hidden={player.isNPC}
            playerKey={props.playerKey}
            playerStatusFlag={playerStatusFlag}
            selectedFlag={selectedFlag}
            showDeckCallout={_showDeckCallout}
            isDeckCalloutVisible={isDeckCalloutVisible}
          />
        </div>

        <div id={id} className="player-hand">
          <CardStack
            cards={cards}
            hidden={cards.length === 0}
            isSelectable
            player={player}
            title={player.title}
          />
        </div>
      </div>
      <DeckCallout player={player} hidden={!isDeckCalloutVisible} onHideCallout={_hideDeckCallout} target={'#' + id} />
    </section>
  );
}
