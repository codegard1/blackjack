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
import { PlayerKey } from "../types";
import { PlayingCard } from "../classes";
import { defaultSelectedPlayerKeys } from "../definitions";

// Context
import AppContext from "../classes/AppContext";

export interface ITableProps {

}

export const Table: React.FC<ITableProps> = (props) => {

  // Context
  const {
    deck,
    deckActions,
    gameStore,
    gameStatus,
    playerStore,
    gameStatusFlag,
    settingStore,
    storeActions,
  } = React.useContext(AppContext);

  // State
  const [hasInitialized, setInitialized] = React.useState<boolean>(false);
  const [isSpinnerVisible, setSpinnerVisible] = React.useState<boolean>(false);
  const [isDialogVisible, setDialogVisible] = React.useState<boolean>(false);
  const [isDeckCalloutVisible, setDeckCalloutVisible] = React.useState<boolean>(false);
  const [drawn, setDrawn] = React.useState<PlayingCard[]>([]);
  const [selected, setSelected] = React.useState<PlayingCard[]>([]);
  const [playerHands, setPlayerHands] = React.useState<PlayingCard[]>([]);
  const [dealerHasControl, setDealerHasControl] = React.useState<boolean>(false);
  const [loser, setLoser] = React.useState<number>(1);
  const [minimumBet, setminimumBet] = React.useState<number>(25);
  const [pot, setPot] = React.useState<number>(0);
  const [round, setRound] = React.useState<number>(0);
  const [turnCount, setTurnCount] = React.useState<number>(0);
  const [winner, setWinner] = React.useState<PlayerKey>();
  const [activePlayers, setActivePlayers] = React.useState<PlayerKey[]>(defaultSelectedPlayerKeys);
  const [currentPlayerKey, setCurrentPlayerKey] = React.useState<number>(0);
  const [playerStats, setPlayerStats] = React.useState<any>({});

  // const onChangeGame = () => {
  //   const { dealerHasControl, gameStatus, loser, minimumBet, pot, round, turnCount, winner } = GameStore.getState();
  //   Object.assign(state, {
  //     dealerHasControl,
  //     gameStatus,
  //     isDeckCalloutVisible: true,
  //     loser,
  //     minimumBet,
  //     pot,
  //     round,
  //     turnCount,
  //     winner,
  //   })
  // }

  // const onChangeDeck = () => {
  //   const { deck, drawn, selected, playerHands } = DeckStore.getState();
  //   this.setState({ deck, drawn, selected, playerHands });
  // }

  // const onChangeControlPanel = () => {
  //   this.setState({
  //     ...ControlPanelStore.getState(),
  //     hasInitialized: true
  //   });
  // }

  // const onChangePlayerStore = () => {
  //   const { players, activePlayers, currentPlayerKey } = PlayerStore.getState();
  //   this.setState({ players, activePlayers, currentPlayerKey, hasInitialized: true });
  // }

  // const onChangeStatsStore = () => {
  //   let playerStats = {};
  //   for (const key in this.state.activePlayers) {
  //     playerStats[key] = StatsStore.getStats(key)
  //   }
  //   this.setState({ playerStats });
  // }



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
   * render PlayerContainers for players listed in PlayerStore.state.activePLayers
   */
  const renderPlayerContainers = () => {
    if (playerStore.length > 0) {
      return playerStore.all.map(pl =>
        <StackItem align="stretch" grow={2} key={`PlayerStack-${pl.key}`}>
          <PlayerContainer
            isDeckCalloutVisible={isDeckCalloutVisible}
            key={`PlayerContainer-${pl.key}`}
            minimumBet={minimumBet}
            player={pl}
            playerKey={pl.key}
            dealerHasControl={dealerHasControl}
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
          {!gameStatusFlag && <Text block nowrap variant="xLarge">Pot: ${pot}</Text>}
          <Stack horizontal horizontalAlign="stretch" disableShrink wrap tokens={{ childrenGap: 10, padding: 10 }}>
            {renderPlayerContainers}
          </Stack>
        </Stack>
      }

      {!isDialogVisible &&
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
              cards={drawn}
              title="Drawn Cards"
              hidden={!settingStore.isDrawnVisible}
              isSelectable={false}
            />
          </StackItem>
          <StackItem>
            <CardStack
              cards={selected}
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

