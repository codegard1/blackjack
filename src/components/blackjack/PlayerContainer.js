import React from "react";
import * as T from "prop-types";
import { Stack, Text, Icon, mergeStyleSets, getTheme, FontWeights } from "@fluentui/react";

/* custom stuff */
import BaseComponent from "../BaseComponent";
import DeckContainer from "./DeckContainer";
import DeckCallout from "./DeckCallout";
import ControlPanel from "./ControlPanel";
import StatusDisplay from "./StatusDisplay";
import Agent from "./Agent";
import DeckStore from "./stores/DeckStore";

export class PlayerContainer extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      isStatusCalloutVisible: false,
      isDeckCalloutVisible: this.props.isDeckCalloutVisible,
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
    minimumBet: T.number.isRequired,
  };

  _showDeckCallout() {
    this.setState({ isDeckCalloutVisible: true });
  }

  _hideDeckCallout() {
    this.setState({ isDeckCalloutVisible: false });
  }

  render() {
    const { player, playerStats, playerHand, playerKey } = this.props;
    const handValue = playerHand.handValue;



    const playerStatusFlag = (player.isBusted ||
      player.isFinished ||
      player.isStaying ||
      !player.turn);

    /* selectedFlag is true if getSelected() returns an array */
    const selectedFlag = !!DeckStore.getSelected(playerKey);

    const theme = getTheme();
    const styles = mergeStyleSets({
      playerContainer: {
        backgroundColor: 'whitesmoke',
        borderRadius: '0.25em',
        transition: 'all 300ms ease-in',
        border: '1px solid rgba(25, 25, 25, 0.1)',
      },
      playerTitleBar: {
        marginLeft: '1.5em',
        marginTop: '1em',
      },
      selected: {
        boxShadow: '15px 15px 20px -9px rgba(184, 184, 184, 1)',
        border: '2px solid blue',
      },
      staying: {
        border: '2px solid green',
        backgroundColor: 'ghostwhite',
      },
      redBorder: {
        border: '3px solid red'
      },
    });

    /* style PlayerContainer conditionally */
    let playerContainerStyles = [styles.PlayerContainer];
    if (player.turn) {
      playerContainerStyles.push(styles.selected);
    }
    if (player.isStaying && !player.turn) {
      playerContainerStyles.push(styles.staying);
    }


    return (
      <Stack verticalAlign className={playerContainerStyles}>

        <Stack horizontal horizontalAlign="space-between" style={{ padding: '5px' }} className={styles.playerTitleBar}>
          <Stack.Item align="start">
            <Text block nowrap variant="large">
              {`${player.title} ($${player.bank || 0})  `}</Text>
          </Stack.Item>
          <Stack.Item>
            <StatusDisplay player={player} stats={playerStats} />
          </Stack.Item>
        </Stack>

        <Stack verticalAlign horizontalAlign="space-between">
          {player.isNPC && this.props.dealerHasControl &&
            <Stack.Item>
              <Agent
                dealerHasControl={this.props.dealerHasControl}
                gameStatus={this.props.gameStatus}
                handValue={handValue}
                playerKey={playerKey}
              />
            </Stack.Item>
          }

          {!player.isNPC &&
            <Stack.Item>
              <ControlPanel
                gameStatus={this.props.gameStatus}
                gameStatusFlag={this.props.gameStatusFlag}
                hidden={player.isNPC}
                minimumBet={this.props.minimumBet}
                player={player}
                playerKey={playerKey}
                playerStatusFlag={playerStatusFlag}
                playerIsNPC={player.isNPC}
                selectedFlag={selectedFlag}
                showDeckCallout={this._showDeckCallout}
                isDeckCalloutVisible={this.state.isDeckCalloutVisible}
              />
            </Stack.Item>
          }

          <Stack.Item className={`DeckCalloutTarget-${player.key}`}>
            <DeckContainer
              deck={playerHand.hand}
              gameStatus={this.props.gameStatus}
              gameStatusFlag={this.props.gameStatusFlag}
              handValue={handValue}
              hidden={false}
              isCardDescVisible={this.props.isCardDescVisible}
              isDealerHandVisible={this.props.isDealerHandVisible}
              isHandValueVisible={this.props.isHandValueVisible}
              isNPC={player.isNPC}
              isPlayerDeck
              isSelectable
              player={player}
              title={player.title}
              turnCount={this.props.turnCount}
            />
          </Stack.Item>
        </Stack>
        <DeckCallout
          player={player}
          isDeckCalloutVisible={this.state.isDeckCalloutVisible}
          onHideCallout={this._hideDeckCallout}
          target={`.DeckCalloutTarget-${player.title}`}
        />
      </Stack>
    );
  }
}

export default PlayerContainer;

