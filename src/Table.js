import React from "react";
import {
  MessageBar,
  MessageBarType
} from "office-ui-fabric-react/lib/MessageBar";

/* custom stuff */
import { PlayerContainer } from "./PlayerContainer";
import { DeckContainer } from "./DeckContainer";
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
      allPlayersBusted: false,
      allPlayersNonBusted: true,
      allPlayersStaying: false,
      bustedPlayers: [],
      // currentPlayer: 0, /* deprecated */
      currentPlayerIndex: -1,
      gameStatus: 0,
      highestHandValue: -1,
      minimumBet: null,
      nonBustedPlayers: null,
      players: [],
      pot: 0,
      round: 0,
      tieFlag: false,
      turnCount: 0,
      winningPlayerId: -1,
      winningPlayerIndex: -1,
      // ControlPanelStore
      isDeckVisible: true,
      isDrawnVisible: false,
      isMessageBarVisible: false,
      isOptionsPanelVisible: false,
      isSelectedVisible: false,
      messageBarDefinition: {
        type: MessageBarType.info,
        text: "",
        isMultiLine: false
      },
    };

    //Flux helpers
    this._bind("onChangeDeck", "onChangeControlPanel", "onChangeGame");
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
      // currentPlayer: newState.currentPlayerIndex,
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
        <PlayerContainer
          key={index}
          player={player}
          controlPanelProps={{
            gameStatus: this.state.gameStatus,
            currentPlayer: this.state.currentPlayerIndex,
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
                  hidden={false}
                  isSelectable={false}
                />}

              {this.state.isDrawnVisible &&
                <DeckContainer
                  deck={this.state.drawn}
                  title="Drawn Cards"
                  hidden={false}
                  isSelectable={false}
                />}

              {this.state.isSelectedVisible &&
                <DeckContainer
                  deck={this.state.selected}
                  title="Selected Cards"
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
