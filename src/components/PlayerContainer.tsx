// React
import React from "react";

// Fluent UI
import { Layer, Stack, Text } from "@fluentui/react";
import { useId } from '@fluentui/react-hooks';

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
  const { cards, handValue } = deckState.playerHands[playerKey]

  const id = useId(`DeckCalloutTarget-${player.title}`);

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
    <Stack className={playerContainerClass}>

      <Stack horizontal horizontalAlign="space-between" style={{ padding: '5px' }} className={`${player.title}-titleBar playerContainerClass`}>
        <Stack.Item align="start">
          <Text block nowrap variant="large">
            {`${player.title} ($${player.bank || 0})  `}</Text>
        </Stack.Item>
        <Stack.Item>
          <StatusDisplay player={player} stats={player.stats} />
        </Stack.Item>
      </Stack>

      <Stack horizontalAlign="space-between">
        {player.isNPC && gameState.dealerHasControl &&
          <Stack.Item>
            <Agent
              dealerHasControl={gameState.dealerHasControl}
              gameStatus={gameState.gameStatus}
              handValue={handValue}
              playerKey={playerKey}
            />
          </Stack.Item>
        }

        <Stack.Item>
          <ControlPanel
            hidden={player.isNPC}
            playerKey={props.playerKey}
            playerStatusFlag={playerStatusFlag}
            selectedFlag={selectedFlag}
            showDeckCallout={_showDeckCallout}
            isDeckCalloutVisible={isDeckCalloutVisible}
          />
        </Stack.Item>

        <Stack.Item id={id}>
          <CardStack
            cards={cards}
            hidden={cards.length === 0}
            isSelectable
            player={player}
            title={player.title}
          />
        </Stack.Item>
      </Stack>
      <Layer>
        <DeckCallout
          player={player}
          hidden={!isDeckCalloutVisible}
          onHideCallout={_hideDeckCallout}
          target={'#' + id}
        />
      </Layer>
    </Stack>
  );
}
