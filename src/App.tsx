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
import { PlayerStore, PlayingCardDeck } from './classes';
import AppContext from './classes/AppContext';
import { ActivityLog, OptionsPanel, SplashScreen, Table } from './components';
import { SettingContext, SettingDispatchContext, settingDefaults, settingReducer, DeckContext, DeckDispatchContext, deckDefaults, deckReducer } from './ctx';
import { defaultplayersArr } from './definitions';
import { DeckAction, GameStatus, StoreName } from './enums';
import { IAppContextProps, IGameStoreProps } from './interfaces';
import { DeckState, MessageBarDefinition, PlayerKey, PlayerStats, SettingsState } from './types';

// Necessary in order for Fluent Icons to render on the page
initializeIcons();

// Main Component
const App = () => {

  // NEW State using Reducers
  const [settings, toggleSetting] = React.useReducer(settingReducer, settingDefaults);
  const [deck1, deckDispatch] = React.useReducer(deckReducer, deckDefaults);


  //----------------------------------------------------------------//

  // State
  const [playerStore] = React.useState<PlayerStore>(new PlayerStore());
  const [deck] = React.useState<PlayingCardDeck>(new PlayingCardDeck());
  const [gameStatus, setGameStatus] = React.useState<GameStatus>(0);
  const [gameStatusFlag, setGameStatusFlag] = React.useState<boolean>(false);
  const [isSpinnerVisible, setSpinnerVisible] = React.useState<boolean>(true);
  const [loser, setLoser] = React.useState<PlayerKey>();
  const [winner, setWinner] = React.useState<PlayerKey>();
  const [dealerHasControl, setDealerHasControl] = React.useState<boolean>(false);
  const [minimumBet, setMinimumBet] = React.useState<number>(25);
  const [pot, setPot] = React.useState<number>(0);
  const [round, setRound] = React.useState<number>(0);
  const [turnCount, setTurnCount] = React.useState<number>(0);
  const [lastWriteTime, setLastWriteTime] = React.useState<string>('');
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
    let nextGameStatus: GameStatus = GameStatus.InProgress;

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
        setGameStatus(GameStatus.InProgress);
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
  const deal = (key: PlayerKey) => {
    deckDispatch({ type: DeckAction.DrawOne, playerKey: key });
    deck.deal(2, []);
    setGameStatus(1);
  }

  const hit = (playerKey: string) => { }

  const stay = (playerKey: string) => { };

  const bet = (playerKey: string, amount: number) => { };

  const newGame = (selectedPlayers: PlayerKey[]) => {
    deckDispatch({ type: DeckAction.Shuffle });
    deck.reset();
    selectedPlayers.forEach((pk, ix) => {
      const _p = defaultplayersArr.find(v => v.key === pk);
      if (_p) console.log(JSON.stringify(_p));
      if (_p) playerStore!.newPlayer(pk, _p?.title, _p?.isNPC, ix, _p?.bank, _p?.disabled)
    });
    playerStore.all.forEach((p) => {
      deckDispatch({ type: DeckAction.DrawOne, playerKey: p.key });
      deckDispatch({ type: DeckAction.DrawOne, playerKey: p.key });
      p.cards.push(...deck.draw(2));
    });
    newRound();
  };

  const showMessageBar = (d: MessageBarDefinition) => {
    setMessageBarDefinition(d);
    toggleSetting({ key: 'isMessageBarVisible', value: true });
  };

  const hideMessageBar = () => toggleSetting({ key: 'isMessageBarVisible', value: false });

  const resetGame = () => {
    deckDispatch({ type: DeckAction.Reset });
    deck.reset();
    setDealerHasControl(false);
    setGameStatus(0);
    setPot(0);
    setRound(0);
    setTurnCount(0);
  };

  const newRound = () => {
    /* reset state props to default */
    setDealerHasControl(false);
    setGameStatus(0);
    setPot(0);
    setRound(round + 1);
    setTurnCount(0);

    /* start a new round with a new deck */
    // PlayersStore.currentPlayer.startTurn();
    setGameStatus(GameStatus.InProgress);
  }
  const _evaluateGame = (statusCode: GameStatus) => {
    switch (statusCode) {
      case GameStatus.Init:
        console.log('Game Status: Init');
        break;

      case GameStatus.InProgress /*   Game in progress; first play  */:
        console.log('Game Status: InProgress');
        /*   all players bet the minimum to start  */
        if (turnCount === 0) _ante(minimumBet);
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
          setGameStatus(GameStatus.InProgress)
          endGameTrap();
        } else {
          return false;
        }
        break;

      case GameStatus.GameOver:
        console.log('Game Status: GameOver');
        setGameStatus(GameStatus.Init);
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
    if (gameStatus !== GameStatus.Init && !_evaluateGame(GameStatus.NextTurn)) {
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
    gameStatus,
    gameStatusFlag,
    hideMessageBar,
    hit,
    isSpinnerVisible, setSpinnerVisible,
    lastWriteTime, setLastWriteTime,
    loser, setLoser,
    messageBarDefinition, setMessageBarDefinition,
    minimumBet, setMinimumBet,
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
    deck,
  };

  React.useEffect(() => {
    // console.log('Initialization effect');
    initializeStores();
  }, [])

  React.useEffect(() => {
    // if (null !== deck) {
    //   console.log('Deck effect');

    //   localStorage.setItem(StoreName.DECKSTORE, JSON.stringify(deck));
    // }
  }, [deck]);

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

            </DeckDispatchContext.Provider>
          </DeckContext.Provider>
        </SettingDispatchContext.Provider>
      </SettingContext.Provider>
    </AppContext.Provider>
  );
}

export default App;
