import React from "react";
import * as T from "prop-types";
import { Stack, Text } from "@fluentui/react";

/* custom stuff */
import BaseComponent from "../BaseComponent";
import DeckContainer from "./DeckContainer";
import DeckCallout from "./DeckCallout";
import ControlPanel from "./ControlPanel";
import StatusDisplay from "./StatusDisplay";
import Agent from "./Agent";
import "./PlayerContainer.css";

/* flux */
import DeckStore from "./stores/DeckStore";
import PlayerStore from "./stores/PlayerStore";

export class PlayerContainer extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      isStatusCalloutVisible: false,
    };

    this._bind(
      "_hideDeckCallout",
      "_showDeckCallout",
    );
  }

  static propTypes = {
    gameStatus: T.number.isRequired,
    gameStatusFlag: T.bool.isRequired,
    isCardDescVisible: T.bool.isRequired,
    isDealerHandVisible: T.bool.isRequired,
    isDeckCalloutVisible: T.bool.isRequired,
    isHandValueVisible: T.bool.isRequired,
    player: T.object.isRequired,
    playerHand: T.object,
    playerKey: T.string.isRequired,
    playerStats: T.object.isRequired,
  };

  _showDeckCallout() {
    this.setState({ isDeckCalloutVisible: true });
  }

  _hideDeckCallout() {
    this.setState({ isDeckCalloutVisible: false });
  }

  render() {
    const playerId = PlayerStore.getPlayerId(this.props.playerKey);

    /* style PlayerContainer conditionally */
    let playerContainerClass = "PlayerContainer ";
    if (!this.props.player.empty && this.props.player.turn) {
      playerContainerClass += "selected ";
    }
    if (
      !this.props.player.empty &&
      this.props.player.isStaying &&
      !this.props.player.turn
    ) {
      playerContainerClass += "staying ";
    }

    const playerStatusFlag = (this.props.player.isBusted ||
      this.props.player.isFinished ||
      this.props.player.isStaying ||
      !this.props.player.turn);

    /* selectedFlag is true if getSelected() returns an array */
    const selectedFlag = !!DeckStore.getSelected(playerId);

    const handValue = DeckStore.getHandValue(playerId);

    return (
      <Stack verticalAlign className={playerContainerClass}>

        <Stack horizontal horizontalAlign="space-between" style={{ padding: '5px' }} className={`${this.props.player.title}-titleBar playerContainerClass`}>
          <Stack.Item align="start">
            <Text block nowrap variant="large">
              {`${this.props.player.title} ($${this.props.player.bank || 0})  `}</Text>
          </Stack.Item>
          <Stack.Item>
            <StatusDisplay player={this.props.player} stats={this.props.playerStats} />
          </Stack.Item>
        </Stack>

        <Stack verticalAlign horizontalAlign="space-between">
          {this.props.player.isNPC && this.props.dealerHasControl &&
            <Stack.Item>
              <Agent
                dealerHasControl={this.props.dealerHasControl}
                gameStatus={this.props.gameStatus}
                handvalue={handValue}
                id={playerId}
                key={this.props.playerKey}
              />
            </Stack.Item>
          }

          <Stack.Item>
            <ControlPanel
              gameStatus={this.props.gameStatus}
              gameStatusFlag={this.props.gameStatusFlag}
              hidden={!this.props.player.isNPC}
              minimumBet={this.props.minimumBet}
              player={this.props.player}
              playerId={playerId}
              playerKey={this.props.playerKey}
              playerStatusFlag={playerStatusFlag}
              playerIsNPC={this.props.player.isNPC}
              selectedFlag={selectedFlag}
              showDeckCallout={this._showDeckCallout}
              isDeckCalloutVisible={this.state.isDeckCalloutVisible}
            />
          </Stack.Item>

          <Stack.Item className={`DeckCalloutTarget-${this.props.player.title}`}>
            <DeckContainer
              deck={this.props.playerHand}
              gameStatus={this.props.gameStatus}
              gameStatusFlag={this.props.gameStatusFlag}
              handValue={handValue}
              hidden={!(this.props.playerHand.length > 0)}
              isCardDescVisible={this.props.isCardDescVisible}
              isDealerHandVisible={this.props.isDealerHandVisible}
              isHandValueVisible={this.props.isHandValueVisible}
              isNPC={this.props.player.isNPC}
              isPlayerDeck
              isSelectable
              player={this.props.player}
              title={this.props.player.title}
              turnCount={this.props.turnCount}
            />
          </Stack.Item>
        </Stack>
        <DeckCallout
          player={this.props.player}
          isDeckCalloutVisible={this.props.isDeckCalloutVisible}
          onHideCallout={this._hideDeckCallout}
          target={`.DeckCalloutTarget-${this.props.player.title}`}
        />
      </Stack>
    );
  }
}

export default PlayerContainer;

