import React from "react";
import DeckContainer from "./DeckContainer";
import Player from "./Player";
import {
  MessageBar,
  MessageBarType
} from "office-ui-fabric-react/lib/MessageBar";
import { BaseComponent } from "./BaseComponent";

/* flux */
import { GameStore } from "./stores/GameStore";
import { DeckStore } from "./stores/DeckStore";
import { ControlPanelStore } from "./stores/ControlPanelStore";
import { AppActions } from "./actions/AppActions";
import { OptionsPanel } from "./OptionsPanel";

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

    //Deck Methods
    this._bind(
      "_deselect",
      "_removeSelectedFromDrawn",
      "_select"
    );

    // ControlPanel methods
    this._bind(
      "_bet",
      "_deal",
      "_draw",
      "_drawFromBottomOfDeck",
      "_drawRandom",
      "_hit",
      "_putOnBottomOfDeck",
      "_putOnTopOfDeck",
      "_reset",
      "_showOptionsPanel",
      "_stay",
      "_toggleDeckVisibility",
      "_toggleDrawnVisibility",
      "_toggleSelectedVisibility"
    );

    //Game State Methods
    this._bind(
      "_newRound",
      "_resetGame"
    );

    //Flux helpers
    this._bind("onChangeDeck", "onChangeControlPanel", "onChangeGame");

    // group methods to pass into Player as props
    this.controlPanelMethods = {
      deal: this._deal,
      hit: this._hit,
      bet: this._bet,
      stay: this._stay,
      draw: this._draw,
      reset: AppActions.reset,
      putOnBottomOfDeck: this._putOnBottomOfDeck,
      putOnTopOfDeck: this._putOnTopOfDeck,
      drawRandom: this._drawRandom,
      drawFromBottomOfDeck: this._drawFromBottomOfDeck,
      showOptionsPanel: this._showOptionsPanel,
      newRound: this._newRound
    };
    this.deckMethods = {
      select: this._select,
      deselect: this._deselect,
      removeSelectedFromPlayerHand: this._removeSelectedFromPlayerHand,
      removeSelectedFromDrawn: this._removeSelectedFromDrawn,
    };
    this.OptionsPanelMethods = {
      toggleDeckVisibility: this._toggleDeckVisibility,
      toggleSelectedVisibility: this._toggleSelectedVisibility,
      toggleDrawnVisibility: this._toggleDrawnVisibility,
      resetGame: this._resetGame
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

  _resetGame() {
    AppActions.newDeck();
    AppActions.reset();
    AppActions.showMessageBar("Game Reset");
  }

  _newRound() {
    AppActions.newDeck();
    AppActions.newRound();
    AppActions.showMessageBar("New Round", MessageBarType.info);
  }

  _reset() {
    AppActions.reset();
  }

  _draw(num) {
    AppActions.draw(num);
  }

  _deal() {
    AppActions.deal();
  }

  _hit(playerId) {
    AppActions.hit(playerId);
  }

  _stay() {
    AppActions.stay();
  }

  _drawFromBottomOfDeck(num) {
    AppActions.drawFromBottomOfDeck(num);
  }

  _drawRandom(num) {
    AppActions.drawRandom(num);
  }

  _putOnTopOfDeck(cards) {
    AppActions.putOnTopOfDeck(cards);
    AppActions.removeSelectedFromPlayerHand(cards);
  }

  _putOnBottomOfDeck(cards) {
    AppActions.putOnBottomOfDeck(cards);
    AppActions.removeSelectedFromPlayerHand(cards);
  }

  _select(cardAttributes) {
    AppActions.select(cardAttributes);
  }

  _deselect(cardAttributes) {
    AppActions.deselect(cardAttributes);
  }

  _removeSelectedFromDrawn(cards) {
    AppActions.removeSelectedFromDrawn(cards);
  }

  _toggleDeckVisibility(bool) {
    AppActions.toggleDeckVisibility(bool);
  }

  _toggleDrawnVisibility(bool) {
    AppActions.toggleDrawnVisibility(bool);
  }

  _toggleSelectedVisibility(bool) {
    AppActions.toggleSelectedVisibility(bool);
  }

  _bet(ev, target, playerIndex, amount) {
    AppActions.bet(ev, target, playerIndex, amount);
  }

  /* show the Options Panel */
  _showOptionsPanel() {
    AppActions.showOptionsPanel();
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
                  select={this._select}
                  deselect={this._deselect}
                  hidden={false}
                  isSelectable={false}
                />}

              {this.state.isDrawnVisible &&
                <DeckContainer
                  deck={this.state.drawn}
                  title="Drawn Cards"
                  select={this._select}
                  deselect={this._deselect}
                  hidden={false}
                  isSelectable={false}
                />}

              {this.state.isSelectedVisible &&
                <DeckContainer
                  deck={this.state.selected}
                  title="Selected Cards"
                  select={this._select}
                  deselect={this._deselect}
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
            {...this.OptionsPanelMethods}
          />
        </div>
      </div>
    );
  }
}

export default Table;
