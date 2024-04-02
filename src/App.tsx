// React
import React from 'react';

// FluentUI
import {
  Layer,
  Stack,
  Text,
  initializeIcons
} from '@fluentui/react';

// Local Resources
import './App.css';
import { ActivityLog, OptionsPanel, SplashScreen, Table } from './components';
import { DeckContext, DeckDispatchContext, GameContext, GameDispatchContext, SettingContext, SettingDispatchContext, deckDefaults, gameDefaults, settingDefaults } from './ctx';
import { defaultplayersArr } from './definitions';
import { DeckAction, GameAction, GameStatus, StoreName } from './enums';
import { deckReducer, gameReducer, settingReducer, clearStores } from './functions';
import { DeckState, MessageBarDefinition, PlayerKey, PlayerStats, SettingsState } from './types';

// Necessary in order for Fluent Icons to render on the page
initializeIcons();

// Main Component
const App = () => {

  // NEW State using Reducers
  const [settings, toggleSetting] = React.useReducer(settingReducer, settingDefaults);
  const [deck1, deckDispatch] = React.useReducer(deckReducer, deckDefaults);
  const [gameState, gameDispatch] = React.useReducer(gameReducer, gameDefaults);
  const { playerStore, loser, winner, lastWriteTime, pot, round, turnCount } = gameState;

  //----------------------------------------------------------------//

  // DEPRECATED 
  const newActivityLogItem = (name: string, description: string, iconName: string) => { };

  /**
   * Get values from localStorage
   */
  const initializeStores = () => {
    const _playerStore = localStorage.getItem(StoreName.PLAYERSTORE);
    const _deckStore = localStorage.getItem(StoreName.DECKSTORE);
    if (null !== _deckStore) {
      const _ds: DeckState = JSON.parse(_deckStore);
      for (let key in _ds) {
        // if (key !== 'isSplashScreenVisible') toggleSetting({ key, value: _ss[key] });
      }
    }

    const _settingStore = localStorage.getItem(StoreName.SETTINGSTORE);
    if (null !== _settingStore) {
      const _ss: SettingsState = JSON.parse(_settingStore);
      for (let key in _ss) {
        if (key !== 'isSplashScreenVisible') toggleSetting({ key, value: _ss[key] });
      }
    }
  }

  const endGameTrap = (): boolean => {

    let ret = false;
    let nextGameStatus = GameStatus.InProgress;

    /* Set next game status */
    if (playerStore.all[1].hasBlackjack) {
      nextGameStatus = GameStatus.DealerWins; // Dealer has blackjack ; dealer wins
    } else if (playerStore.all[0].isBusted) {
      nextGameStatus = GameStatus.DealerWins; // Player 0 busted ; dealer wins
    } else if (playerStore.all[1].isBusted) {
      nextGameStatus = GameStatus.HumanWins; // Dealer is busted; Player 0 wins
    } else if (playerStore.all[1].isStaying) {
      if (
        playerStore.all[1].highestValue > playerStore.all[0].highestValue
      ) {
        nextGameStatus = GameStatus.DealerWins; // Dealer has higher hand ; dealer wins
      } else {
        nextGameStatus = GameStatus.HumanWins; // Player 0 has higher hand ; Player 0 wins
      }
    } else {
      if (playerStore.currentPlayer?.isNPC) {
        ret = true;
      } else {
        /* player 0 is not Dealer */
        gameDispatch({ type: GameAction.SetGameStatus, gameStatus: GameStatus.InProgress });
        ret = false;
      }
    }

    /* Endgame Condition encountered! */
    if (nextGameStatus > 2) {
      _evaluateGame(nextGameStatus);

      playerStore.all.forEach(player => {
        /* set properties to increment */
        const statsFrame: PlayerStats = {
          numberOfGamesLost: (player.key === loser ? 1 : 0),
          numberOfGamesPlayed: 1,
          numberOfGamesWon: (player.key === winner ? 1 : 0),
          numberOfTimesBlackjack: (player.hasBlackjack ? 1 : 0),
          numberOfTimesBusted: (player.isBusted ? 1 : 0),
          totalWinnings: (player.key === winner ? pot : 0),
          winLossRatio: 0,
        };
        player.updateStats(statsFrame);
      });
      ret = true;
    }

    return ret;
  }

  /**
   *  GAME ACTIONS
   */
  const deal = (playerKey: PlayerKey) => {
    deckDispatch({ type: DeckAction.Draw, playerKey, numberOfCards: 2, deckSide: 'top' });
    gameDispatch({ type: GameAction.SetGameStatus, gameStatus: GameStatus.InProgress });
  }

  const hit = (playerKey: string) => {
    deckDispatch({ type: DeckAction.Draw, playerKey, numberOfCards: 1, deckSide: 'top' });
  }

  const stay = (playerKey: string) => { };

  const bet = (playerKey: string, amount: number) => { };

  const newGame = (selectedPlayers: PlayerKey[]) => {
    deckDispatch({ type: DeckAction.Reset });
    selectedPlayers.forEach((pk, ix) => {
      deckDispatch({ type: DeckAction.NewPlayerHand, playerKey: pk });
      deal(pk);
      const _p = defaultplayersArr.find(v => v.key === pk);
      // if (_p) console.log(JSON.stringify(_p));
      if (_p) playerStore!.newPlayer(pk, _p?.title, _p?.isNPC, ix, _p?.bank, _p?.disabled)
    });
    newRound();
  };

  const showMessageBar = (d: MessageBarDefinition) => {
    gameDispatch({ type: GameAction.ShowMessageBar, messageBarDefinition: d });
    toggleSetting({ key: 'isMessageBarVisible', value: true });
  };

  const hideMessageBar = () => toggleSetting({ key: 'isMessageBarVisible', value: false });

  const resetGame = () => {
    deckDispatch({ type: DeckAction.Reset });
    gameDispatch({ type: GameAction.ResetGame });
  };

  const newRound = () => {
    /* reset state props to default */
    gameDispatch({ type: GameAction.NewRound });

    /* start a new round with a new deck */
    // PlayersStore.currentPlayer.startTurn();
    gameDispatch({ type: GameAction.SetGameStatus, gameStatus: GameStatus.InProgress });
  }

  const _evaluateGame = (statusCode: GameStatus) => {
    switch (statusCode) {
      case GameStatus.Init:
        console.log('Game Status: Init');
        break;

      case GameStatus.InProgress /*   Game in progress; first play  */:
        console.log('Game Status: InProgress');
        /*   all players bet the minimum to start  */
        if (turnCount === 0) _ante(gameState.minimumBet);
        gameDispatch({ type: GameAction.IncrementTurn });
        endGameTrap();
        break;

      case GameStatus.NextTurn:
        console.log('Game Status: NextTurn');
        /*   stay (go to next turn)  */
        /* If endgame conditions not met   */
        if (!endGameTrap()) {
          /* increment currentPlayerIndex */
          playerStore._nextPlayer();
          gameDispatch({ type: GameAction.SetGameStatus, gameStatus: GameStatus.InProgress });
          endGameTrap();
        } else {
          return false;
        }
        break;

      case GameStatus.GameOver:
        console.log('Game Status: GameOver');
        gameDispatch({ type: GameAction.SetGameStatus, gameStatus: GameStatus.Init });
        break;

      case GameStatus.HumanWins:
        console.log('Game Status: HumanWins');
        const winningPlayerTitle = playerStore.all[0].title;
        newActivityLogItem(winningPlayerTitle, 'wins!', 'Crown');

        gameDispatch({ type: GameAction.SetWinner, playerKey: playerStore.all[0].key });
        gameDispatch({ type: GameAction.SetLoser, playerKey: playerStore.all[1].key });
        playerStore._payout(playerStore.all[0].key, pot);
        gameDispatch({ type: GameAction.SetWinner, })
        break;

      case GameStatus.DealerWins:
        console.log('Game Status: DealerWins');
        gameDispatch({ type: GameAction.SetWinner, playerKey: playerStore.all[1].key });
        gameDispatch({ type: GameAction.SetLoser, playerKey: playerStore.all[0].key });
        playerStore._payout(playerStore.all[1].key, pot);
        newActivityLogItem(playerStore.all[1].title, 'wins!', 'Crown');
        gameDispatch({ type: GameAction.EndGame });
        break;

      default:
        break;
    }
  };

  const _gameStay = () => {
    if (gameState.gameStatus !== GameStatus.Init && !_evaluateGame(GameStatus.NextTurn)) {
      gameDispatch({ type: GameAction.SetControllingPlayer, controllingPlayerKey: 'dealer' });
    }
  }

  const _ante = (amount: number) => {
    playerStore._allPlayersAnte(amount);
    gameDispatch({ type: GameAction.AddToPot, potIncrement: (amount * playerStore.length) })
    newActivityLogItem('All players', `ante $${amount}`, 'Money');
  }

  React.useEffect(() => {
    // console.log('Initialization effect');
    initializeStores();
  }, [])

  React.useEffect(() => {
    if (null !== deck1) {
      //   console.log('Deck effect');

      localStorage.setItem(StoreName.DECKSTORE, JSON.stringify(deck1));
    }
  }, [deck1]);

  React.useEffect(() => {
    // if (null !== playerStore) {
    //   console.log('Players effect', playerStore.state);
    //   localStorage.setItem(StoreName.PLAYERSTORE, JSON.stringify(playerStore.state));
    // }
  }, [playerStore.state]);

  React.useEffect(() => {
    if (!!settings) {
      localStorage.setItem(StoreName.SETTINGSTORE, JSON.stringify(settings));
    }
  }, [settings]);



  return (
    <SettingContext.Provider value={settings}>
      <SettingDispatchContext.Provider value={toggleSetting}>
        <DeckContext.Provider value={deck1}>
          <DeckDispatchContext.Provider value={deckDispatch}>
            <GameContext.Provider value={gameState}>
              <GameDispatchContext.Provider value={gameDispatch}>

                <Layer>
                  <SplashScreen />
                  <OptionsPanel />
                </Layer>
                <Stack tokens={{ childrenGap: 15 }} horizontalAlign='space-between' verticalAlign='space-evenly'>
                  <Table />
                  <ActivityLog />
                  <div style={{ backgroundColor: '#eee' }}>
                    <Text>{JSON.stringify(deck1)}</Text>
                  </div>
                </Stack>

              </GameDispatchContext.Provider>
            </GameContext.Provider>
          </DeckDispatchContext.Provider>
        </DeckContext.Provider>
      </SettingDispatchContext.Provider>
    </SettingContext.Provider>
  );
}

export default App;
