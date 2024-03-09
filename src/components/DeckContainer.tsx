// React
import React from 'react';


/* fluent ui */
import {
  Separator,
  Stack,
  Icon,
  Text,
  nullRender
} from "@fluentui/react";

/* custom stuff */
import { CardContainer } from './';

// import AppActions from "../../_old/src/components/blackjack/actions/AppActions";
import { IDeckContainerProps } from '../interfaces/IDeckContainerProps';
import AppContext from '../classes/AppContext';

export const DeckContainer: React.FC<IDeckContainerProps> = (props) => {

  // Context props
  const {
    deck,
    isCardDescVisible,
    gameStatus,
    isDealerHandVisible,
    isHandValueVisible,
  } = React.useContext(AppContext);

  // State
  const [isDeckVisible, setVisible] = React.useState<boolean>(!props.hidden);

  const _toggleDeck = () => {
    setVisible(!isDeckVisible);
  }

  // Create CardContainers to display cards
  const cardElements = (deck && deck.length > 0) ?
    deck.cards.map((card, index) =>
      <CardContainer
        key={card.suit + "-" + card.description}
        {...card}
        // select={cardAttributes => AppActions.select(cardAttributes)}
        // deselect={cardAttributes => AppActions.deselect(cardAttributes)}
        isSelectable={props.isSelectable}
        isBackFacing={index === 0 && !isDealerHandVisible && props.isNPC}
        isDescVisible={isCardDescVisible}
      />
    ) : [];

  // Set toggle icon for Deck titles
  const toggleIcon = <Icon iconName={isDeckVisible ? "ChevronUp" : "ChevronDown"} />


  /* Deck Title */
  const deckTitleString = `${props.title} (${deck.length})`;

  /* Hand Value (if it's a player deck) */
  let handValueString;
  if (props.handValue) {
    if (!props.isNPC || (props.isNPC && isDealerHandVisible)) {
      handValueString = `Hand Value: ${props.handValue.aceAsOne} `;
      if (props.handValue.aceAsOne !== props.handValue.aceAsEleven) {
        handValueString += " / " + props.handValue.aceAsEleven;
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

  return props.hidden ? nullRender() : (
    <Stack verticalAlign="stretch" tokens={tokens.sectionStack}>
      {!props.isPlayerDeck && (
        <Text variant="mediumPlus" nowrap block onClick={_toggleDeck}>
          {deckTitleString}&nbsp;{toggleIcon}
        </Text>
      )}
      {props.isPlayerDeck &&
        isHandValueVisible && (
          <Text variant="large">{handValueString}</Text>
        )}
      <Stack horizontal horizontalAlign="start" tokens={tokens.cardStack} wrap>
        {isDeckVisible && (cardElements)}
      </Stack>
    </Stack>
  );
}
