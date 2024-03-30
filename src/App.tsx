// React
import React from 'react';

// FluentUI
import {
  Layer,
  MessageBarType,
  Stack,
  Text,
  initializeIcons
} from '@fluentui/react';

// Local Resources
import './App.css';
import { PlayerStore } from './classes';
import AppContext from './classes/AppContext';
import { ActivityLog, OptionsPanel, SplashScreen, Table } from './components';
import { DeckContext, DeckDispatchContext, SettingContext, SettingDispatchContext, deckDefaults, deckReducer, settingDefaults, settingReducer, gameReducer, GameContext, GameDispatchContext, gameDefaults } from './ctx';
import { defaultplayersArr } from './definitions';
import { DeckAction, GameAction, GameStatus, StoreName } from './enums';
import { IAppContextProps, IGameStoreProps } from './interfaces';
import { DeckState, MessageBarDefinition, PlayerKey, PlayerStats, SettingsState } from './types';

// Necessary in order for Fluent Icons to render on the page
initializeIcons();

// Main Component
const App = () => {

  // NEW State using Reducers
  const [settings, toggleSetting] = React.useReducer(settingReducer, settingDefaults);
  const [deck1, deckDispatch] = React.useReducer(deckReducer, deckDefaults);
  const [gameState, gameDispatch] = React.useReducer(gameReducer, gameDefaults);

  //----------------------------------------------------------------//

  // State
  const [playerStore] = React.useState<PlayerStore>(new PlayerStore());
  const [loser, setLoser] = React.useState<PlayerKey>();
  const [lastWriteTime, setLastWriteTime] = React.useState<string>('');

  // DEPRECATED 
  const [winner, setWinner] = React.useState<PlayerKey>();
  const [dealerHasControl, setDealerHasControl] = React.useState<boolean>(false);
  const [pot, setPot] = React.useState<number>(0);
  const [round, setRound] = React.useState<number>(0);
  const [turnCount, setTurnCount] = React.useState<number>(0);
  const [messageBarDefinition, setMessageBarDefinition] = React.useState<MessageBarDefinition>({
    type: MessageBarType.info,
    text: "",
    isMultiLine: false
  });
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

  /**
   * delete all entries from stores
  */
  const clearStores = () => {
    localStorage.removeItem(StoreName.DECKSTORE);
    localStorage.removeItem(StoreName.PLAYERSTORE);
    localStorage.removeItem(StoreName.SETTINGSTORE);
    localStorage.removeItem(StoreName.STATSTORE);
  };

  const evaluateGame = (statusCode: number) => { _evaluateGame(statusCode) };
  const endGame = () => { };
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
    setDealerHasControl(false);
    gameDispatch({ type: GameAction.SetGameStatus, gameStatus: GameStatus.Init });
    setPot(0);
    setRound(0);
    setTurnCount(0);
  };

  const newRound = () => {
    /* reset state props to default */
    setDealerHasControl(false);
    gameDispatch({ type: GameAction.SetGameStatus, gameStatus: GameStatus.Init });
    setPot(0);
    setRound(round + 1);
    setTurnCount(0);

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
        setTurnCount(turnCount + 1);
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

        setWinner(playerStore.all[0].key);
        setLoser(playerStore.all[1].key);
        playerStore._payout(playerStore.all[0].key, pot);
        endGame();
        break;

      case GameStatus.DealerWins:
        console.log('Game Status: DealerWins');
        setWinner(playerStore.all[1].key);
        setLoser(playerStore.all[0].key);
        playerStore._payout(playerStore.all[1].key, pot);
        newActivityLogItem(playerStore.all[1].title, 'wins!', 'Crown');
        endGame();
        break;

      default:
        break;
    }
  };

  const _gameStay = () => {
    if (gameState.gameStatus !== GameStatus.Init && !_evaluateGame(GameStatus.NextTurn)) {
      setDealerHasControl(true);
    }
  }

  const _ante = (amount: number) => {
    playerStore._allPlayersAnte(amount);
    setPot(pot + amount * playerStore.length);
    newActivityLogItem('All players', `ante $${amount}`, 'Money');
  }


  // All variables and functions related to Game state
  const gameStore: IGameStoreProps = {
    bet,
    deal,
    dealerHasControl, setDealerHasControl,
    endGame,
    endGameTrap,
    evaluateGame,
    hideMessageBar,
    hit,
    lastWriteTime, setLastWriteTime,
    loser, setLoser,
    messageBarDefinition, setMessageBarDefinition,
    newActivityLogItem,
    newGame,
    newRound,
    pot, setPot,
    resetGame,
    round, setRound,
    showMessageBar,
    stay,
    turnCount, setTurnCount,
    winner, setWinner,
  }

  const contextDefaults: IAppContextProps = {
    initializeStores,
    clearStores,
    playerStore,
    gameStore,
  };

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
    <AppContext.Provider value={contextDefaults}>
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
    </AppContext.Provider>
  );
}

export default App;
