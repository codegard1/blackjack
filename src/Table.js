import React from "react";
import {
  MessageBar,
  MessageBarType
} from "office-ui-fabric-react/lib/MessageBar";

/* custom stuff */
import PlayerContainer from "./PlayerContainer";
import DeckContainer from "./DeckContainer";
import BaseComponent from "./BaseComponent";
import OptionsPanel from "./OptionsPanel";
import { defaultPlayers } from "./definitions";
import PotDisplay from "./PotDisplay";

/* flux */
import { GameStore } from "./stores/GameStore";
import { DeckStore } from "./stores/DeckStore";
import ControlPanelStore from "./stores/ControlPanelStore";
import AppActions from "./actions/AppActions";

class Table extends BaseComponent {
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
      players: [],
      pot: 0,
      round: 0,
      turnCount: 0,
      // ControlPanelStore
      isDealerHandVisible: false,
      isDeckVisible: false,
      isDrawnVisible: false,
      isHandValueVisible: false,
      isMessageBarVisible: false,
      isOptionsPanelVisible: false,
      isSelectedVisible: false,
      messageBarDefinition: {
        type: MessageBarType.info,
        text: "",
        isMultiLine: false
      }
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
    AppActions.newGame(defaultPlayers);
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
    });
    this.setState(newState);
  }
  onChangeDeck() {
    const newState = DeckStore.getState();
    this.setState({
      deck: newState.deck,
      selected: newState.selected,
      drawn: newState.drawn
    });
  }
  onChangeControlPanel() {
    const newState = ControlPanelStore.getState();
    this.setState({
      isDeckVisible: newState.isDeckVisible,
      isDrawnVisible: newState.isDrawnVisible,
      isSelectedVisible: newState.isSelectedVisible,
      // isOptionsPanelVisible: newState.isOptionsPanelVisible,
      // isDealerHandVisible: newState.isDealerHandVisible,
      // isHandValueVisible: newState.isHandValueVisible,
      isMessageBarVisible: newState.isMessageBarVisible,
      messageBarDefinition: newState.messageBarDefinition
    });
  }

  render() {
    const playersArray = this.state.players.map(player => (
      <PlayerContainer key={`Player-${player.id}`} playerId={player.id} />
    ));

    return (
      <div id="Table">
        <div className="ms-Grid">
          <div className="ms-Grid-row">
            <div className="ms-Grid-col ms-sm12">
              {this.state.isMessageBarVisible && (
                <MessageBar
                  messageBarType={this.state.messageBarDefinition.type}
                  isMultiline={this.state.messageBarDefinition.isMultiLine}
                  onDismiss={AppActions.hideMessageBar}
                >
                  {this.state.messageBarDefinition.text}
                </MessageBar>
              )}
            </div>
          </div>

          <PotDisplay pot={this.state.pot} />

          <div className="ms-Grid-row">
            <div className="ms-Grid-col ms-sm6">{playersArray[0]}</div>
            <div className="ms-Grid-col ms-sm6">{playersArray[1]}</div>
          </div>

          <div className="ms-Grid-row">
            <div className="ms-Grid-col ms-sm12">
              {this.state.isDeckVisible && (
                <DeckContainer
                  deck={this.state.deck.cards}
                  title="Deck"
                  hidden={false}
                  isSelectable={false}
                />
              )}

              {this.state.isDrawnVisible && (
                <DeckContainer
                  deck={this.state.drawn}
                  title="Drawn Cards"
                  hidden={false}
                  isSelectable={false}
                />
              )}

              {this.state.isSelectedVisible && (
                <DeckContainer
                  deck={this.state.selected}
                  title="Selected Cards"
                  hidden={false}
                  isSelectable={false}
                />
              )}
            </div>
          </div>

          <OptionsPanel gameStatus={this.state.gameStatus} />
        </div>
      </div>
    );
  }
}

export default Table;
