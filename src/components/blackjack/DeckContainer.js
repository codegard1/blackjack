import React from "react";
import * as T from "prop-types";

/* custom stuff */
import BaseComponent from "../BaseComponent";
import CardContainer from "./CardContainer";

/* fluent ui */
import {
  Separator,
  Stack,
  Icon,
  Text
} from "@fluentui/react";


import AppActions from "./actions/AppActions";
import { nullRender } from "@fluentui/react";

class DeckContainer extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      isDeckVisible: true
    };

    /* bind private methods */
    this._bind("_toggleDeck");
  }

  static propTypes = {
    // gameStatusFlag: T.bool.isRequired, // props
    deck: T.array.isRequired, // DeckStore
    gameStatus: T.number, // GameStore
    handValue: T.object, // DeckStore
    hidden: T.bool.isRequired, // props
    isCardDescVisible: T.bool.isRequired, // ControlPanelStore
    isDealerHandVisible: T.bool, // ControlPanelStore 
    isHandValueVisible: T.bool, // ControlPanelStore
    isNPC: T.bool, // props
    isPlayerDeck: T.bool,
    isSelectable: T.bool.isRequired, // props
    player: T.object, // GameStore
    title: T.string.isRequired, // props
    turnCount: T.number, // GameStore
  };

  _toggleDeck() {
    this.setState({ isDeckVisible: !this.state.isDeckVisible });
  }

  render() {
    // Create CardContainers to display cards
    const cardElements = (this.props.deck && this.props.deck.length > 0) ?
      this.props.deck.map((card, index) =>
        <CardContainer
          key={card.suit + "-" + card.description}
          {...card}
          select={cardAttributes => AppActions.select(cardAttributes)}
          deselect={cardAttributes => AppActions.deselect(cardAttributes)}
          isSelectable={this.props.isSelectable}
          isBackFacing={index === 0 && !this.props.isDealerHandVisible && this.props.isNPC}
          isDescVisible={this.props.isCardDescVisible}
        />
      ) : [];

    // Set toggle icon for Deck titles
    const toggleIcon = this.state.isDeckVisible ? (
      <Icon iconName="ChevronUp" />
    ) : (
      <Icon iconName="ChevronDown" />
    );

    /* Deck Title */
    const deckTitleString = `${this.props.title} (${this.props.deck &&
      this.props.deck.length})`;

    /* Hand Value (if it's a player deck) */
    let handValueString;
    if (this.props.handValue) {
      if (!this.props.isNPC || (this.props.isNPC && this.props.isDealerHandVisible)) {
        handValueString = `Hand Value: ${this.props.handValue.aceAsOne} `;
        if (this.props.handValue.aceAsOne !== this.props.handValue.aceAsEleven) {
          handValueString += " / " + this.props.handValue.aceAsEleven;
        }
      }
    }

    // Style tokens for Fluent UI Stacks
    const tokens = {
      sectionStack: {
        childrenGap: 10,
      },
      cardStack: {
        childrenGap: 5,
        padding: 5
      },
    };

    return this.props.hidden ? nullRender() : (
      <Stack verticalAlign="stretch" tokens={tokens.sectionStack}>
        {!this.props.isPlayerDeck && (
          <Text variant="mediumPlus" nowrap block onClick={this._toggleDeck}>
            {deckTitleString}&nbsp;{toggleIcon}
          </Text>
        )}
        {this.props.isPlayerDeck &&
          this.props.isHandValueVisible && (
            <Text variant="large">{handValueString}</Text>
          )}
        <Stack horizontal horizontalAlign="start" tokens={tokens.cardStack} wrap>
          {this.state.isDeckVisible && (cardElements)}
        </Stack>
      </Stack>
    );
  }
}

export default DeckContainer;
