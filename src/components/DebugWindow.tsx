import { Stack, Text, nullRender } from "@fluentui/react";
import React from "react";
import { useGameContext } from "../context";
import { JsonViewer } from './';

export const DebugWindow: React.FC = () => {

  // State from context
  const { gameState } = useGameContext();

  // Local State
  const [isDeckStateVisible, setDeckStateVisible] = React.useState<boolean>(true);
  const [isPlayerHandStateVisible, setPlayerHandStateVisible] = React.useState<boolean>(false);
  const [isGameStateVisible, setGameStateVisible] = React.useState<boolean>(false);
  const [isPlayerStoreVisible, setPlayerStoreVisible] = React.useState<boolean>(false);

  return (
    <Stack styles={{ root: { backgroundColor: '#eee' } }}>
      <Text as='h1' block onClick={() => setDeckStateVisible(!isDeckStateVisible)}>
        Deck</Text>
      {isDeckStateVisible ? <JsonViewer data={gameState.deck.cardKeys} /> : nullRender()}

      <Text as='h1' block onClick={() => setPlayerHandStateVisible(!isPlayerHandStateVisible)}>
        Player Hands</Text>
      {isPlayerHandStateVisible ? <JsonViewer data={gameState.deck.playerHands} /> : nullRender()}

      <Text as='h1' block onClick={() => setGameStateVisible(!isGameStateVisible)}>
        Game</Text>
      {isGameStateVisible ? <JsonViewer data={gameState} /> : nullRender()}

      <Text as='h1' block onClick={() => setPlayerStoreVisible(!isPlayerStoreVisible)}>
        Players</Text>
      {isPlayerStoreVisible ? <JsonViewer data={gameState.playerStore.state} /> : nullRender()}

    </Stack>
  );

}
