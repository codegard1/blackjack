// React
import React from 'react';

// FluentUI
import {
  Stack,
  Layer,
  initializeIcons,
  MessageBarType
} from '@fluentui/react';

// Local Resources
import './App.css';
import { IAppContextProps, IDeckStoreProps, IGameStoreProps, ISettingStoreProps } from './interfaces';
import { ActivityLog, OptionsPanel, SplashScreen, Table } from './components';
import { IndexedDB, PlayingCard, PlayingCardDeck, PlayerStore, Player } from './classes';
import { defaultPlayers } from './definitions';
import { MessageBarDefinition, PlayerKey, PlayerStats, PlayingCardKey } from './types';
import { GameStatus } from './enums/GameStatus';
import AppContext from './classes/AppContext';

// Necessary in order for Fluent Icons to render on the page
initializeIcons();

// Main Component
const App = () => {

  // IDB  
  const db = new IndexedDB('BlackJackDB', 1, (db, oldVersion, newVersion) => {
    // upgrade database
    switch (oldVersion) {
      case 0: {
        db.createObjectStore('App');
      }
    }
  });

  // PlayerStore
  const playerStore = new PlayerStore();


  // State
  // TODO: determine if State and "Actions" should all be defined here in App
  const [deck, setDeck] = React.useState<PlayingCardDeck>(new PlayingCardDeck());
  const [gameStatus, setGameStatus] = React.useState<GameStatus>(0);
  const [gameStatusFlag, setGameStatusFlag] = React.useState<boolean>(false);
  const [isActivityLogVisible, setActivityLogVisible] = React.useState<boolean>(false);
  const [isCardDescVisible, setCardDescVisible] = React.useState<boolean>(false);
  const [isCardTitleVisible, setCardTitleVisible] = React.useState<boolean>(false);
  const [isDealerHandVisible, setDealerHandVisible] = React.useState<boolean>(false);
  const [isDeckVisible, setDeckVisible] = React.useState<boolean>(true);
  const [isDrawnVisible, setDrawnVisible] = React.useState<boolean>(false);
  const [isHandValueVisible, setHandValueVisible] = React.useState<boolean>(false);
  const [isOptionsPanelVisible, setOptionsPanelVisible] = React.useState<boolean>(false);
  const [isSelectedVisible, setSelectedVisible] = React.useState<boolean>(false);
  const [isSplashScreenVisible, setSplashScreenVisible] = React.useState<boolean>(false);
  const [isMessageBarVisible, setMessageBarVisible] = React.useState<boolean>(false);

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
   * delete all entries from stores
   */
  const clearStores = () => { };
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
    deck.deal(2, []);
    setGameStatus(1);
  }
  const hit = (playerKey: string) => { }
  const stay = (playerKey: string) => { };
  const bet = (playerKey: string, amount: number) => { };
  const newGame = (players: PlayerKey[]) => {
    deck.reset();
    playerStore.all.forEach((p) => p.cards.push(...deck.draw(2)));
    newRound();
  };
  const showMessageBar = (d: MessageBarDefinition) => {
    setMessageBarDefinition(d);
    setMessageBarVisible(true);
  };
  const hideMessageBar = () => setMessageBarVisible(false);
  const resetGame = () => {
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


  /**
   * All state variables related to App settings
   */
  const settingStore: ISettingStoreProps = {
    isActivityLogVisible, setActivityLogVisible,
    isCardDescVisible, setCardDescVisible,
    isCardTitleVisible, setCardTitleVisible,
    isDealerHandVisible, setDealerHandVisible,
    isDeckVisible, setDeckVisible,
    isDrawnVisible, setDrawnVisible,
    isHandValueVisible, setHandValueVisible,
    isMessageBarVisible, setMessageBarVisible,
    isOptionsPanelVisible, setOptionsPanelVisible,
    isSelectedVisible, setSelectedVisible,
    isSplashScreenVisible, setSplashScreenVisible,
  };

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
    initializeStores: () => { },
    clearStores: () => { },
    playerStore,
    settingStore,
    gameStore,
    deck,
  };

  React.useEffect(() => {
    if (null !== deck) {
      console.log('Deck effect');
    }
  }, [deck]);

  React.useEffect(() => {
    if (null !== playerStore) {
      console.log('Players effect');
    }
  }, [playerStore]);

  React.useEffect(() => {
    if (null !== settingStore) {
      console.log('settingStore effect', JSON.stringify(settingStore));
      db.set('settingStore', 'settingStore', JSON.stringify(settingStore));
    }
  }, [settingStore]);

  React.useEffect(() => {
    console.log('initial effect');
    // Set players
    defaultPlayers.forEach((p) => playerStore.newPlayer(p.key, p.title, p.isNPC, p.id, p.bank, p.lastBet));
    newGame(playerStore.all.map((v) => v.key));

  }, []);

  return (
    <AppContext.Provider value={contextDefaults}>
      <Layer>
        <SplashScreen />
        <OptionsPanel />
      </Layer>
      <Stack tokens={{ childrenGap: 15 }} horizontalAlign='space-between' verticalAlign='space-evenly'>
        <Table />
        <ActivityLog hidden={!settingStore.isActivityLogVisible} />
      </Stack>
    </AppContext.Provider>
  );
}

export default App;
