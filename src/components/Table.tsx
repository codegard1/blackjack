// React
import React from "react";

// Fluent UI
import {
  DefaultEffects,
  Icon,
  MotionAnimations,
  Spinner,
  SpinnerSize,
  Stack,
  StackItem,
  Text,
  nullRender,
} from '@fluentui/react';

// Local Resources
import {
  CardStack, PlayerContainer,
} from ".";

// Context
import { PlayingCard } from "../classes";
import { DeckContext, useGameContext, useSettingContext } from '../context';


export const Table: React.FC = () => {

  // Context
  const { settings,toggleSetting } = useSettingContext();
  const deck1 = React.useContext(DeckContext);
  const { gameState, gameDispatch } = useGameContext();
  const playerStore = gameState.playerStore;


  /**
   * Toggle the Options Panel visibility
   * @returns void
   */
  const toggleOptionsPanel = () => {
    toggleSetting({ key: 'isOptionsPanelVisible', value: !settings.isOptionsPanelVisible });
  }


  // Ad-hod styles for the Table
  const tableStyles = {
    boxShadow: DefaultEffects.elevation16,
    borderRadius: DefaultEffects.roundedCorner6,
    backgroundColor: 'ghostwhite',
    animation: MotionAnimations.fadeIn
  }

  return (
    <Stack verticalAlign="start" wrap tokens={{ childrenGap: 10, padding: 10 }} style={tableStyles}>

      <Stack horizontal horizontalAlign="end" disableShrink>
        <Icon iconName="Settings" aria-label="Settings" style={{ fontSize: "24px" }} onClick={toggleOptionsPanel} />
      </Stack>

      {!gameState.isSpinnerVisible ? nullRender() :
        <Spinner
          size={SpinnerSize.large}
          label="Wait, wait..."
          ariaLive="assertive"
          labelPosition="right"
          style={{ animation: MotionAnimations.scaleDownIn }}
        />}

      <Stack verticalAlign="space-around" tokens={{ childrenGap: 10, padding: 10, }}>

        {!gameState.gameStatusFlag && <Text block nowrap variant="xLarge">Pot: ${gameState.pot}</Text>}

        <Stack horizontal horizontalAlign="stretch" disableShrink wrap tokens={{ childrenGap: 10, padding: 10 }}>

          {null === playerStore || playerStore.length === 0
            ? <StackItem>No players</StackItem>
            : playerStore.all.map(p =>
              <StackItem align="stretch" grow={1} key={`PlayerStack-${p.key}`}>
                <Text block>{p.title}</Text>
                <PlayerContainer
                  key={`PlayerContainer-${p.key}`}
                  playerKey={p.key}
                  player={p}
                />
              </StackItem>
            )}
        </Stack>
      </Stack>

      {!settings.isSplashScreenVisible && null !== deck1.cardKeys &&
        <Stack verticalAlign="stretch" wrap tokens={{ childrenGap: 10, padding: 10 }} verticalFill>

          <StackItem>
            <CardStack
              cards={deck1.cardKeys.map((ck) => new PlayingCard(ck))}
              title="Deck"
              hidden={!settings.isDeckVisible}
              isSelectable={false}
            />
          </StackItem>
          <StackItem>
            <CardStack
              cards={deck1.drawnKeys.map((ck) => new PlayingCard(ck))}
              title="Drawn Cards"
              hidden={!settings.isDrawnVisible}
              isSelectable={false}
            />
          </StackItem>
          <StackItem>
            <CardStack
              cards={deck1.selectedKeys.map((ck) => new PlayingCard(ck))}
              title="Selected Cards"
              hidden={!settings.isSelectedVisible}
              isSelectable={false}
            />
          </StackItem>
        </Stack>
      }
    </Stack>
  );
}

