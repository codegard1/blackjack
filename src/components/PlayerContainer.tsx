// React
import React from "react";

// Fluent UI
import { Stack, Text } from "@fluentui/react";

/* custom stuff */
import { DeckContainer, DeckCallout, ControlPanel, StatusDisplay } from './';
import Agent from "../../_old/src/components/blackjack/Agent";
import { IPlayerContainerProps } from "../interfaces";

// Styles
import "./PlayerContainer.css";

// Context
import DeckStore from "../../_old/src/components/blackjack/stores/DeckStore";
import AppContext from "../classes/AppContext";

// Component
export const PlayerContainer: React.FC<IPlayerContainerProps> = (props) => {

  // Context
  const {

  } = React.useContext(AppContext);

  // State
  const [isStatusCalloutVisible, setStatusCalloutVisible] = React.useState<boolean>(false);
  const [isDeckCalloutVisible, setDeckCalloutVisible] = React.useState<boolean>(props.isDeckCalloutVisible);

  const _showDeckCallout = () => setDeckCalloutVisible(true);
  const _hideDeckCallout = () => setDeckCalloutVisible(false);

  const { player, playerStats, playerHand, playerKey } = props;
  const handValue = playerHand.handValue;

  /* style PlayerContainer conditionally */
  let playerContainerClass = "PlayerContainer ";
  if (player.turn) {
    playerContainerClass += "selected ";
  }
  if (
    !player.empty &&
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
  const selectedFlag = !!DeckStore.getSelected(playerKey);


  return (
    <Stack className={playerContainerClass}>

      <Stack horizontal horizontalAlign="space-between" style={{ padding: '5px' }} className={`${player.title}-titleBar playerContainerClass`}>
        <Stack.Item align="start">
          <Text block nowrap variant="large">
            {`${player.title} ($${player.bank || 0})  `}</Text>
        </Stack.Item>
        <Stack.Item>
          <StatusDisplay player={player} stats={playerStats} />
        </Stack.Item>
      </Stack>

      <Stack horizontalAlign="space-between">
        {player.isNPC && props.dealerHasControl &&
          <Stack.Item>
            <Agent
              dealerHasControl={props.dealerHasControl}
              gameStatus={props.gameStatus}
              handValue={handValue}
              playerKey={playerKey}
            />
          </Stack.Item>
        }

        {!player.isNPC &&
          <Stack.Item>
            <ControlPanel
              gameStatus={props.gameStatus}
              gameStatusFlag={props.gameStatusFlag}
              hidden={player.isNPC}
              minimumBet={props.minimumBet}
              player={player}
              playerKey={playerKey}
              playerStatusFlag={playerStatusFlag}
              playerIsNPC={player.isNPC}
              selectedFlag={selectedFlag}
              showDeckCallout={_showDeckCallout}
              isDeckCalloutVisible={isDeckCalloutVisible}
            />
          </Stack.Item>
        }

        <Stack.Item className={`DeckCalloutTarget-${player.title}`}>
          <DeckContainer
            deck={playerHand.hand}
            gameStatus={props.gameStatus}
            gameStatusFlag={props.gameStatusFlag}
            handValue={handValue}
            hidden={false}
            isCardDescVisible={props.isCardDescVisible}
            isDealerHandVisible={props.isDealerHandVisible}
            isHandValueVisible={props.isHandValueVisible}
            isNPC={player.isNPC}
            isPlayerDeck
            isSelectable
            player={player}
            title={player.title}
            turnCount={props.turnCount}
          />
        </Stack.Item>
      </Stack>
      <DeckCallout
        player={player}
        isDeckCalloutVisible={isDeckCalloutVisible}
        onHideCallout={_hideDeckCallout}
        target={`.DeckCalloutTarget-${player.title}`}
      />
    </Stack>
  );

}

