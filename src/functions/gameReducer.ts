import { gameDefaults } from "../ctx/gameDefaults";
import { GameStatus } from "../enums";
import { GameAction } from "../enums/GameAction";
import { IGameReducerAction } from "../interfaces";
import { GameState, PlayerStats } from "../types";

/**
 * Reducer function for game state
 * @param state game state object
 * @param action action containing the state parameters
 * @returns modified game state
 */
export function gameReducer(state: GameState, action: IGameReducerAction) {

  const {
    controllingPlayerKey,
    gameStatus,
    messageBarDefinition,
    minimumBet,
    playerKey,
    potIncrement,
    type,
  } = action;

  switch (type) {
    // Toggle visibility of the spinner
    case GameAction.SetSpinnerVisible: {
      state.isSpinnerVisible = !state.isSpinnerVisible;
      return state;
    }

    case GameAction.ShowMessageBar: {
      if (undefined === messageBarDefinition) {
        state.messageBarDefinition = gameDefaults.messageBarDefinition;
      } else {
        state.messageBarDefinition = messageBarDefinition;
      }
      return state;
    }

    case GameAction.SetMinimumBet: {
      if (undefined !== minimumBet)
        state.minimumBet = minimumBet;
      return state;
    }

    case GameAction.AddToPot: {
      if (undefined !== potIncrement)
        state.pot += potIncrement;
      return state;
    }

    case GameAction.IncrementRound: {
      state.round += 1;
      return state;
    }

    case GameAction.IncrementTurn: {
      state.turnCount += 1;
      return state;
    }

    case GameAction.SetControllingPlayer: {
      state.controllingPlayer = controllingPlayerKey;
      state.dealerHasControl = controllingPlayerKey === 'dealer';
      return state;
    }

    case GameAction.SetGameStatus: {
      if (undefined !== gameStatus) state.gameStatus = gameStatus;
      return state;
    }

    // TODO
    case GameAction.EndGame: {
      return state;
    }

    // TODO
    case GameAction.NewGame: {
      if (undefined !== playerKey && typeof playerKey !== 'string') {
        state.activePlayerKeys = playerKey;
        playerKey.forEach(v => {
          const _p = state.players?.filter(p => p.key === v)[0];
          state.playerStore.newPlayer(_p.key, _p.title, _p.isNPC, _p.id, _p.bank,);
        })
      }
      state.controllingPlayer = undefined;
      state.gameStatus = GameStatus.Init;
      state.pot = 0;
      state.round = state.round + 1;
      state.turnCount = 0;
      return state;
    }

    // TODO
    case GameAction.EvaluateGame: {
      switch (gameStatus) {
        case GameStatus.Init:
          console.log('Game Status: Init');
          break;

        case GameStatus.InProgress:
          /*   Game in progress; first play  */
          console.log('Game Status: InProgress');
          /*   all players bet the minimum to start  */
          if (state.turnCount === 0) state.playerStore._allPlayersAnte(state.minimumBet);
          state.turnCount = state.turnCount + 1;
          // endGameTrap();
          break;

        case GameStatus.NextTurn:
          console.log('Game Status: NextTurn');
          /*   stay (go to next turn)  */
          /* If endgame conditions not met   */
          if (!state.gameStatusFlag) {
            /* increment currentPlayerIndex */
            state.playerStore._nextPlayer();
            state.gameStatus = GameStatus.InProgress;
          }
          break;

        case GameStatus.GameOver:
          console.log('Game Status: GameOver');
          state.gameStatus = GameStatus.Init;
          break;

        case GameStatus.HumanWins:
          console.log('Game Status: HumanWins');
          const winningPlayerTitle = state.playerStore.all[0].title;
          // newActivityLogItem(winningPlayerTitle, 'wins!', 'Crown');

          state.winner = state.playerStore.all[0].key;
          state.loser = state.playerStore.all[1].key;
          state.playerStore._payout(state.playerStore.all[0].key, state.pot);
          break;

        case GameStatus.DealerWins:
          console.log('Game Status: DealerWins');
          state.winner = state.playerStore.all[1].key;
          state.loser = state.playerStore.all[0].key;
          state.playerStore._payout(state.playerStore.all[1].key, state.pot);
          // newActivityLogItem(playerStore.all[1].title, 'wins!', 'Crown');
          // gameDispatch({ type: GameAction.EndGame });
          break;

        default:
          break;
      }
      return state;
    }

    // TODO
    case GameAction.EndGameTrap: {

      let nextGameStatus = gameStatus ? gameStatus : GameStatus.InProgress;
      const playerStore = state.playerStore;

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
          state.gameStatusFlag = true;
        } else {
          /* player 0 is not Dealer */
          state.gameStatus = GameStatus.InProgress;
          state.gameStatusFlag = false;
        }
      }

      /* Endgame Condition encountered! */
      if (nextGameStatus > 2) {
        // _evaluateGame(nextGameStatus);

        playerStore.all.forEach(player => {
          /* set properties to increment */
          const statsFrame: PlayerStats = {
            numberOfGamesLost: (player.key === state.loser ? 1 : 0),
            numberOfGamesPlayed: 1,
            numberOfGamesWon: (player.key === state.winner ? 1 : 0),
            numberOfTimesBlackjack: (player.hasBlackjack ? 1 : 0),
            numberOfTimesBusted: (player.isBusted ? 1 : 0),
            totalWinnings: (player.key === state.winner ? state.pot : 0),
            winLossRatio: 0,
          };
          player.updateStats(statsFrame);
        });
        state.gameStatusFlag = true;
      }

      return state;
    }

    /**
     * Reset game state to default
     */
    case GameAction.ResetGame: {
      return gameDefaults;
    }

    // TODO
    case GameAction.SetLoser: {
      if (undefined !== playerKey && typeof playerKey === 'string')
        state.loser = playerKey;
      return state;
    }

    // TODO
    case GameAction.SetWinner: {
      if (undefined !== playerKey && typeof playerKey === 'string')
        state.winner = playerKey;
      return state;
    }

    /**
     * Start a new round of a continuous game
     */
    case GameAction.NewRound: {
      state.controllingPlayer = state.currentPlayerKey;
      state.gameStatus = GameStatus.InProgress;
      state.pot = 0;
      state.round = state.round + 1;
      state.turnCount = 0;
      return state;
    }

    // TODO
    case GameAction.Stay: {
      if (state.gameStatus !== GameStatus.Init && state.gameStatusFlag) {
        state.controllingPlayer = 'dealer';
      }
      return state;
    }

    // TODO
    case GameAction.Ante: {
      return state;
    }



    default: {
      return state;
    }
  }

}
