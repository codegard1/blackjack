// React
import React from "react";

// Fluent UI
import { Stack, Text } from "@fluentui/react";

/* custom stuff */
import { Agent, CardStack, DeckCallout, ControlPanel, StatusDisplay } from '.';
import { IPlayerContainerProps } from "../interfaces";

// Styles
import "./PlayerContainer.css";

// Context
import AppContext from "../classes/AppContext";

// Component
export const PlayerContainer: React.FC<IPlayerContainerProps> = (props) => {

  // Context
  const {
    gameStatusFlag,
    settingStore,
    gameStatus,
    playerStore,

  } = React.useContext(AppContext);

  // State
  const [isStatusCalloutVisible, setStatusCalloutVisible] = React.useState<boolean>(false);
  const [isDeckCalloutVisible, setDeckCalloutVisible] = React.useState<boolean>(props.isDeckCalloutVisible);

  const _showDeckCallout = () => setDeckCalloutVisible(true);
  const _hideDeckCallout = () => setDeckCalloutVisible(false);

  const { player, playerKey } = props;
  const handValue = player.hand.handValue;

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
        {player.isNPC && props.dealerHasControl &&
          <Stack.Item>
            <Agent
              dealerHasControl={props.dealerHasControl}
              gameStatus={gameStatus}
              handValue={handValue}
              playerKey={playerKey}
            />
          </Stack.Item>
        }

        {!player.isNPC &&
          <Stack.Item>
            <ControlPanel
              gameStatus={gameStatus}
              hidden={player.isNPC}
              minimumBet={props.minimumBet}
              player={player}
              playerKey={playerKey}
              playerStatusFlag={playerStatusFlag}
              selectedFlag={selectedFlag}
              showDeckCallout={_showDeckCallout}
              isDeckCalloutVisible={isDeckCalloutVisible}
            />
          </Stack.Item>
        }

        <Stack.Item className={`DeckCalloutTarget-${player.title}`}>
          <CardStack
            cards={player.hand}
            hidden={false}
            isSelectable
            player={player}
            title={player.title}
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
