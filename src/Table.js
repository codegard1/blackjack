import React from "react";
import {
  MessageBar,
  MessageBarType
} from "office-ui-fabric-react/lib/MessageBar";

/* custom stuff */
import Player from "./Player";
import DeckContainer from "./DeckContainer";
import { BaseComponent } from "./BaseComponent";
import { OptionsPanel } from "./OptionsPanel";

/* flux */
import { GameStore } from "./stores/GameStore";
import { DeckStore } from "./stores/DeckStore";
import { ControlPanelStore } from "./stores/ControlPanelStore";
import { AppActions } from "./actions/AppActions";

export class Table extends BaseComponent {
  constructor() {
    super();
    this.state = {
      //DeckStore
      deck: [],
      drawn: [],
      selected: [],
      playerHands: [],
      //GameStore
      gameStatus: 0,
      minimumBet: 25,
      messageBarDefinition: {
        type: MessageBarType.info,
        text: "",
        isMultiLine: false
      },
      pot: 0,
      round: 0,
      turnCount: 0,
      tieFlag: false,
      // Player (also in GameStore)
      allPlayersStaying: false,
      allPlayersBusted: false,
      allPlayersNonBusted: false,
      currentPlayer: 0,
      players: [],
      playerDefaults: {
        id: 0,
        title: "",
        hand: [],
        handValue: { aceAsOne: 0, aceAsEleven: 0 },
        status: "ok",
        turn: false,
        bank: 1000,
        bet: 0,
        lastAction: "none",
        isStaying: false
      },
      winningPlayerId: -1,
      winningPlayerIndex: -1,
      // ControlPanelStore
      isDeckVisible: true,
      isDrawnVisible: true,
      isSelectedVisible: true,
      isMessageBarVisible: false,
      isOptionsPanelVisible: false
    };

    //Flux helpers
    this._bind("onChangeDeck", "onChangeControlPanel", "onChangeGame");

    // group methods to pass into Player as props
    this.controlPanelMethods = {
      hit: (playerId) => { AppActions.hit(playerId) },
      bet: (ev, target, playerIndex, amount) => {
        ev.preventDefault(); AppActions.bet(playerIndex, amount);
      },
      deal: AppActions.deal,
      draw: (num) => { AppActions.draw(num) },
      drawRandom: (num) => { AppActions.drawRandom(num) },
      reset: AppActions.reset,
      putOnBottomOfDeck: (cards) => {
        AppActions.putOnBottomOfDeck(cards);
        AppActions.removeSelectedFromPlayerHand(cards);
      },
      putOnTopOfDeck: (cards) => {
        AppActions.putOnTopOfDeck(cards);
        AppActions.removeSelectedFromPlayerHand(cards);
      },
      drawFromBottomOfDeck: (num) => { AppActions.drawFromBottomOfDeck(num) },
      newRound: () => {
        AppActions.newDeck();
        AppActions.newRound();
        AppActions.showMessageBar("New Round", MessageBarType.info);
      },
      showOptionsPanel: AppActions.showOptionsPanel,
      stay: AppActions.stay,
    };
    this.deckMethods = {
      select: (cardAttributes) => {
        AppActions.select(cardAttributes);
      },
      deselect: (cardAttributes) => {
        AppActions.deselect(cardAttributes);
      },
      removeSelectedFromDrawn: (cards) => {
        AppActions.removeSelectedFromPlayerHand(cards);
      },
    };
  }

  componentDidMount() {
    /* callback when a change emits from GameStore*/
    GameStore.addChangeListener(this.onChangeGame);
    DeckStore.addChangeListener(this.onChangeDeck);
    ControlPanelStore.addChangeListener(this.onChangeControlPanel);

    /* start a new game with these players */
    const players = [{ id: 1, title: "Chris" }, { id: 2, title: "Dealer" }];
    AppActions.newGame(players);
  }

  componentWillUnmount() {
    /* remove change listeners */
    /* this is redundant because Table never unmounts */
    GameStore.removeChangeListener(this.onChangeGame);
    DeckStore.removeChangeListener(this.onChangeDeck);
    ControlPanelStore.addChangeListener(this.onChangeControlPanel);
  }

  /* flux helpers */
  onChangeGame() {
    const newState = GameStore.getState();
    newState.players.forEach(player => {
      const newHand = DeckStore.getHand(player.id);
      player.hand = newHand;
      // console.log(`getHand: ${player.id} ${JSON.stringify(DeckStore.getHand(player.id))}`);
      // console.log(`player state update: ${player.id} - ${player.title}: ${JSON.stringify(player.hand)}`);
    });
    this.setState({
      allPlayersBusted: newState.allPlayersBusted,
      allPlayersNonBusted: newState.allPlayersNonBusted,
      allPlayersStaying: newState.allPlayersStaying,
      bustedPlayers: newState.bustedPlayers,
      currentPlayer: newState.currentPlayer,
      currentPlayerIndex: newState.currentPlayerIndex,
      gameStatus: newState.gameStatus,
      highestHandValue: newState.highestHandValue,
      minimumBet: newState.minimumBet,
      nonBustedPlayers: newState.nonBustedPlayers,
      players: newState.players,
      pot: newState.pot,
      round: newState.round,
      tieFlag: newState.tieFlag,
      turnCount: newState.turnCount,
      winningPlayerId: newState.winningPlayerId,
      winningPlayerIndex: newState.winningPlayerIndex
    });
  }
  onChangeDeck() {
    const newState = DeckStore.getState();
    // console.log(`onChangeDeck: ${newState}`);
    this.setState({
      deck: newState.deck,
      selected: newState.selected,
      drawn: newState.drawn,
      playerHands: newState.playerHands,
    });
  }
  onChangeControlPanel() {
    const newState = ControlPanelStore.getState();
    this.setState({
      isDeckVisible: newState.isDeckVisible,
      isDrawnVisible: newState.isDrawnVisible,
      isMessageBarVisible: newState.isMessageBarVisible,
      isOptionsPanelVisible: newState.isOptionsPanelVisible,
      isSelectedVisible: newState.isSelectedVisible,
      messageBarDefinition: newState.messageBarDefinition
    });
  }

  render() {
    const playersArray = this.state.players.map((player, index) => {
      // console.log(`Table Render()  player.hand: ${JSON.stringify(player.hand)}`);

      /* if player.hand is undefined then set it to [] */
      player.hand = player.hand ? player.hand : [];

      return (
        <Player
          key={index}
          player={player}
          controlPanelMethods={this.controlPanelMethods}
          deckMethods={this.deckMethods}
          controlPanelProps={{
            gameStatus: this.state.gameStatus,
            currentPlayer: this.state.currentPlayer,
            selectedCards: this.state.selected,
            isDeckVisible: this.state.isDeckVisible,
            isDrawnVisible: this.state.isDrawnVisible,
            isSelectedVisible: this.state.isSelectedVisible,
            turnCount: this.state.turnCount,
            minimumBet: this.state.minimumBet,
            hidden: false
          }}
          deckContainerProps={{
            deck: player.hand,
            pot: this.state.pot,
            title: player.title,
            handValue: player.handValue,
            isSelectable: true,
            hidden: false
          }}
        />
      );
    });

    return (
      <div id="Table">
        <div className="ms-Grid">
          <div className="ms-Grid-row">
            <div className="ms-Grid-col ms-u-sm12">
              {this.state.isMessageBarVisible &&
                <MessageBar
                  messageBarType={this.state.messageBarDefinition.type}
                  isMultiline={this.state.messageBarDefinition.isMultiLine}
                  onDismiss={() =>
                    this.setState({ isMessageBarVisible: false })}
                >
                  {this.state.messageBarDefinition.text}
                </MessageBar>}
            </div>
          </div>

          <div className="ms-Grid-row">
            <div className="ms-Grid-col ms-u-s12">
              <p className="ms-font-xl">
                ${this.state.pot}
              </p>
            </div>
          </div>

          <div className="ms-Grid-row">
            <div className="ms-Grid-col ms-u-sm6">
              {playersArray[0]}
            </div>

            <div className="ms-Grid-col ms-u-sm6">
              {playersArray[1]}
            </div>
          </div>

          <div className="ms-Grid-row">
            <div className="ms-Grid-col ms-u-sm12">
              {this.state.isDeckVisible &&
                <DeckContainer
                  deck={this.state.deck.cards}
                  title="Deck"
                  select={this.deckMethods._select}
                  deselect={this.deckMethods._deselect}
                  hidden={false}
                  isSelectable={false}
                />}

              {this.state.isDrawnVisible &&
                <DeckContainer
                  deck={this.state.drawn}
                  title="Drawn Cards"
                  select={this.deckMethods._select}
                  deselect={this.deckMethods._deselect}
                  hidden={false}
                  isSelectable={false}
                />}

              {this.state.isSelectedVisible &&
                <DeckContainer
                  deck={this.state.selected}
                  title="Selected Cards"
                  select={this.deckMethods._select}
                  deselect={this.deckMethods._deselect}
                  hidden={false}
                  isSelectable={false}
                />}
            </div>
          </div>

          <OptionsPanel
            isOptionsPanelVisible={this.state.isOptionsPanelVisible}
            isDeckVisible={this.state.isDeckVisible}
            isDrawnVisible={this.state.isDrawnVisible}
            isSelectedVisible={this.state.isSelectedVisible}
          />
        </div>
      </div>
    );
  }
}

export default Table;
