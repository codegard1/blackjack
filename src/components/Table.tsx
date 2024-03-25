// React
import React from "react";

// Fluent UI
import {
  DefaultEffects,
  Icon,
  Spinner,
  SpinnerSize,
  Stack,
  StackItem,
  Text,
  MotionAnimations,
  nullRender,
} from '@fluentui/react';

// Local Resources
import {
  CardStack, PlayerContainer,
} from ".";
import { PlayingCard } from "../classes";

// Context
import AppContext from "../classes/AppContext";

export const Table: React.FC = () => {

  // Context
  const {
    playerStore,
    settingStore,
    deck,
    gameStore,
  } = React.useContext(AppContext);

  // State
  const [isSpinnerVisible, setSpinnerVisible] = React.useState<boolean>(false);
  const [isDialogVisible, setDialogVisible] = React.useState<boolean>(false);
  const [isDeckCalloutVisible, setDeckCalloutVisible] = React.useState<boolean>(false);

  /**
   * Toggle the splash screen
   */
  const toggleHideDialog = () => settingStore.setSplashScreenVisible(!settingStore.isSplashScreenVisible);

  /**
   * Toggle the Options Panel visibility
   * @returns void
   */
  const toggleOptionsPanel = () => settingStore.setOptionsPanelVisible(!settingStore.isOptionsPanelVisible);

  /**
   * render PlayerContainers for players listed in PlayerStore.state.activePlayers
   */
  const renderPlayerContainers = () => {
    if (null !== playerStore && playerStore.length > 0) {
      return playerStore.all.map(pl =>
        <StackItem align="stretch" grow={2} key={`PlayerStack-${pl.key}`}>
          <PlayerContainer
            isDeckCalloutVisible={isDeckCalloutVisible}
            key={`PlayerContainer-${pl.key}`}
            minimumBet={gameStore.minimumBet}
            player={pl}
            playerKey={pl.key}
            dealerHasControl={gameStore.dealerHasControl}
          />
        </StackItem>
      );
    } else {
      return <StackItem>No players</StackItem>;
    }
  }


  // slice out the selected players (Chris and Dealer) and return PlayerContainers
  // const selectedPlayersContainers = renderPlayerContainers();

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

      {!isSpinnerVisible ? nullRender() :
        <Spinner
          size={SpinnerSize.large}
          label="Wait, wait..."
          ariaLive="assertive"
          labelPosition="right"
          style={{ animation: MotionAnimations.scaleDownIn }}
        />}

      {!isDialogVisible &&
        <Stack verticalAlign="space-around" tokens={{ childrenGap: 10, padding: 10, }}>
          {!gameStore.gameStatusFlag && <Text block nowrap variant="xLarge">Pot: ${gameStore.pot}</Text>}
          <Stack horizontal horizontalAlign="stretch" disableShrink wrap tokens={{ childrenGap: 10, padding: 10 }}>
            {renderPlayerContainers}
          </Stack>
        </Stack>
      }

      {!isDialogVisible && null !== deck &&
        <Stack verticalAlign="stretch" wrap tokens={{ childrenGap: 10, padding: 10 }} verticalFill>
          <StackItem>

          </StackItem>
          <StackItem>
            <CardStack
              cards={deck.cards}
              title="Deck"
              hidden={!settingStore.isDeckVisible}
              isSelectable={false}
            />
          </StackItem>
          <StackItem>
            <CardStack
              cards={deck.drawn}
              title="Drawn Cards"
              hidden={!settingStore.isDrawnVisible}
              isSelectable={false}
            />
          </StackItem>
          <StackItem>
            <CardStack
              cards={deck.selected}
              title="Selected Cards"
              hidden={!settingStore.isSelectedVisible}
              isSelectable={false}
            />
          </StackItem>
        </Stack>
      }
    </Stack>
  );
}

