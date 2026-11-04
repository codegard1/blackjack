import React from "react";
import { Button } from '@fluentui/react-components';
import { useGameContext } from "../context";
import { JsonViewer } from './';

export const DebugWindow: React.FC = () => {

  // State from context
  const { gameState } = useGameContext();

  // Local State
  const [isDeckStateVisible, setDeckStateVisible] = React.useState<boolean>(false);
  const [isSelectedStateVisible, setSelectedStateVisible] = React.useState<boolean>(false);
  const [isPlayerHandStateVisible, setPlayerHandStateVisible] = React.useState<boolean>(false);
  const [isGameStateVisible, setGameStateVisible] = React.useState<boolean>(false);
  const [isPlayerStoreVisible, setPlayerStoreVisible] = React.useState<boolean>(false);

  return (
    <aside className="debug-window">
      <Button appearance="transparent" onClick={() => setDeckStateVisible(!isDeckStateVisible)}>Deck</Button>
      {isDeckStateVisible && <JsonViewer data={gameState.deck.cardKeys} />}

      <Button appearance="transparent" onClick={() => setSelectedStateVisible(!isSelectedStateVisible)}>Selected</Button>
      {isSelectedStateVisible && <JsonViewer data={gameState.deck.selectedKeys} />}

      <Button appearance="transparent" onClick={() => setPlayerHandStateVisible(!isPlayerHandStateVisible)}>Player Hands</Button>
      {isPlayerHandStateVisible && <JsonViewer data={gameState.deck.playerHands} />}

      <Button appearance="transparent" onClick={() => setGameStateVisible(!isGameStateVisible)}>Game</Button>
      {isGameStateVisible && <JsonViewer data={{
        activePlayerKeys: gameState.playerStore.activePlayerKeys,
        controllingPlayer: gameState.controllingPlayer,
        currentPlayerKey: gameState.playerStore.currentPlayerKey,
        dealerHasControl: gameState.dealerHasControl,
        gameStatus: gameState.gameStatus,
        gameStatusFlag: gameState.gameStatusFlag,
        isSpinnerVisible: gameState.isSpinnerVisible,
        lastWriteTime: gameState.lastWriteTime,
        loser: gameState.loser,
        messageBarDefinition: gameState.messageBarDefinition,
        minimumBet: gameState.minimumBet,
        players: gameState.playerStore.all,
        pot: gameState.pot,
        round: gameState.round,
        turnCount: gameState.turnCount,
        winner: gameState.winner,
      }} />}

      <Button appearance="transparent" onClick={() => setPlayerStoreVisible(!isPlayerStoreVisible)}>Players</Button>
      {isPlayerStoreVisible && <JsonViewer data={gameState.playerStore.state} />}

    </aside>
  );

}
