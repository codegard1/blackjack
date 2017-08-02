import React from "react";
import DeckContainer from "./DeckContainer";
import Player from "./Player";
import {
  MessageBar,
  MessageBarType
} from "office-ui-fabric-react/lib/MessageBar";
import { OptionsPanel } from "./OptionsPanel";
import { BaseComponent } from "./BaseComponent";

/* flux */
import { GameStore } from "./stores/GameStore";
import { DeckStore } from "./stores/DeckStore";
import { ControlPanelStore } from "./stores/ControlPanelStore";
import { AppActions } from "./actions/AppActions";

export class Table extends BaseComponent {
  constructor(props) {
    super(props);
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
      isDrawnVisible: false,
      isSelectedVisible: false,
      isMessageBarVisible: false,
      isOptionsPanelVisible: false
    };

    //Deck Methods
    this._bind(
      "_deselect",
      "_removeSelectedFromDrawn",
      "_removeSelectedFromPlayerHand",
      "_select"
    );

    // ControlPanel methods
    this._bind(
      "_ante",
      "_bet",
      "_clearHand",
      "_deal",
      "_draw",
      "_drawFromBottomOfDeck",
      "_drawRandom",
      "_hit",
      "_putOnBottomOfDeck",
      "_putOnTopOfDeck",
      "_reset",
      "_showMessageBar",
      "_showOptionsPanel",
      "_shuffle",
      "_stay",
      "_toggleDeckVisibility",
      "_toggleDrawnVisibility",
      "_toggleSelectedVisibility"
    );

    //Game State Methods
    this._bind(
      "_evaluateGame",
      "_evaluatePlayers",
      "_newRound",
      "_payout",
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
      reset: this._reset,
      shuffle: this._shuffle,
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
      clearHand: this._clearHand
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

    const players = [{ id: 1, title: "Chris" }, { id: 2, title: "Dealer" }];
    AppActions.newDeck();
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
    this.setState({
      deck: newState.deck,
      selected: newState.selected,
      drawn: newState.drawn,
      playerHands: newState.playerHands
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

  _clearHand(playerIndex) {
    AppActions.clearHand(playerIndex);
  }

  _shuffle() {
    AppActions.shuffle();
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

  _hit(ev, target, index) {
    AppActions.hit(ev, target, index);
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

  _removeSelectedFromPlayerHand(playerIndex = this.state.currentPlayer, cards) {
    AppActions.removeSelectedFromPlayerHand(playerIndex, cards);
  }

  _removeSelectedFromDrawn(cards) {
    AppActions.removeSelectedFromDrawn(cards);
  }

  _showMessageBar(text, type) {
    AppActions.showMessageBar(text, type);
  }

  _toggleDeckVisibility(bool) {
    // this.setState({ isDeckVisible: bool });
    AppActions.toggleDeckVisibility(bool);
  }

  _toggleDrawnVisibility(bool) {
    // this.setState({ isDrawnVisible: bool });
    AppActions.toggleDrawnVisibility(bool);
  }

  _toggleSelectedVisibility(bool) {
    // this.setState({ isSelectedVisible: bool });
    AppActions.toggleSelectedVisibility(bool);
  }

  _evaluateGame(nextGameStatus, nextPlayer) {
    AppActions.evaluateGame(nextGameStatus, nextPlayer);
  }

  _evaluatePlayers(players) {
    AppActions.evaluatePlayers(players);
  }

  _bet(ev, target, playerIndex, amount) {
    AppActions.bet(ev, target, playerIndex, amount);
  }

  _ante(
    amount = this.state.minimumBet,
    players = this.state.players,
    pot = this.state.pot
  ) {
    AppActions.ante(amount, players, pot);
    AppActions.showMessageBar(`Ante: $${amount}`, MessageBarType.info);
  }

  _payout(players, index, amount) {
    AppActions.payout(players, index, amount);
  }

  /* show the Options Panel */
  _showOptionsPanel() {
    AppActions.showOptionsPanel();
  }

  render() {
    const playersArray = this.state.players.map((player, index) => {
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
            {...this.OptionsPanelMethods}
          />
        </div>
      </div>
    );
  }
}

export default Table;
