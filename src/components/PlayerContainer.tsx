// React
import React from "react";

// Fluent UI
import { Layer, Stack, Text, nullRender } from "@fluentui/react";

/* custom stuff */
import { Agent, CardStack, ControlPanel, DeckCallout, StatusDisplay } from '.';
import { IPlayerContainerProps } from "../interfaces";

// Styles
import "./PlayerContainer.css";

// Context
import AppContext from "../classes/AppContext";
import { DeckContext, GameContext } from "../ctx";
import { PlayingCard } from "../classes";

// Component
export const PlayerContainer: React.FC<IPlayerContainerProps> = (props) => {

  // Context
  const deck1 = React.useContext(DeckContext);
  const gameState = React.useContext(GameContext);
  const {
    playerStore,
    gameStore,
  } = React.useContext(AppContext);

  // State
  const [isStatusCalloutVisible, setStatusCalloutVisible] = React.useState<boolean>(false);
  const [isDeckCalloutVisible, setDeckCalloutVisible] = React.useState<boolean>(false);
  const { player, playerKey } = props;
  const playerCards = undefined === deck1.playerHands[playerKey] ? [] :
    deck1.playerHands[playerKey].map((ck) => new PlayingCard(ck));

  const _showDeckCallout = () => setDeckCalloutVisible(true);
  const _hideDeckCallout = () => setDeckCalloutVisible(false);


  /* style PlayerContainer conditionally */
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

  const playerStatusFlag = (player.isBusted ||
    player.isFinished ||
    player.isStaying ||
    !player.turn);

  /* selectedFlag is true if getSelected() returns an array */
  // const selectedFlag = !!DeckStore.getSelected(playerKey);
  const selectedFlag = false;

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
        {player.isNPC && gameStore.dealerHasControl &&
          <Stack.Item>
            <Agent
              dealerHasControl={gameStore.dealerHasControl}
              gameStatus={gameState.gameStatus}
              handValue={player.handValue}
              playerKey={props.playerKey}
            />
          </Stack.Item>
        }

        {!player.isNPC &&
          <Stack.Item>
            <ControlPanel
              hidden={player ? player.isNPC : false}
              player={player}
              playerKey={props.playerKey}
              playerStatusFlag={playerStatusFlag}
              selectedFlag={selectedFlag}
              showDeckCallout={_showDeckCallout}
              isDeckCalloutVisible={isDeckCalloutVisible}
            />
          </Stack.Item>
        }

        <Stack.Item className={`DeckCalloutTarget-${player.title}`}>
          {player.hand.cards ?
            <CardStack
              cards={playerCards}
              hidden={false}
              isSelectable
              player={player}
              title={player.title}
            /> : nullRender()
          }
        </Stack.Item>
      </Stack>
      <Layer>
        <DeckCallout
          player={player}
          isDeckCalloutVisible={isDeckCalloutVisible}
          onHideCallout={_hideDeckCallout}
          target={`.DeckCalloutTarget-${player.title}`}
        />
      </Layer>
    </Stack>
  );
}
