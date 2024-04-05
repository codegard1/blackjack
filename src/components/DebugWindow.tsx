import { Stack, Text } from "@fluentui/react";
import React from "react";
import { gameReducer } from "../functions";
import { DeckContext, DeckDispatchContext, GameContext, GameDispatchContext } from "../context";

export const DebugWindow: React.FC = () => {

  // State from context
  const deck1 = React.useContext(DeckContext),
    deckDispatch = React.useContext(DeckDispatchContext),
    gameState = React.useContext(GameContext),
    gameDispatch = React.useContext(GameDispatchContext);

  return (
    <Stack>
      <Text as='h1' block>Deck</Text>
      <Text block>
        <pre>
          {JSON.stringify(deck1)}
        </pre>
      </Text>
      
      <Text as='h1' block>Game</Text>
      <Text block>
        <pre>
          {JSON.stringify(gameState)}
        </pre>
      </Text>

      <Text as='h1' block>Game</Text>
      <Text block>
        <pre>
          {JSON.stringify(gameState.playerStore)}
        </pre>
      </Text>
    </Stack>
  );

}
