// React
import React, { Props } from 'react';

// Fluent UI
import {
  Stack,
  Icon,
  Text,
  nullRender
} from "@fluentui/react";

/* custom stuff */
import { CardContainer } from '.';
import { ICardStackProps } from '../interfaces';
import AppContext from '../classes/AppContext';

/**
 * A visual component that displays PlayingCards
 * @param props 
 * @returns 
 */
export const CardStack: React.FC<ICardStackProps> = (props) => {

  // Context props
  const {
    settingStore,
    deckStore,
  } = React.useContext(AppContext);

  // State
  const [isDeckVisible, setVisible] = React.useState<boolean>(!props.hidden);

  const _toggleDeck = () => setVisible(!isDeckVisible);

  // Create CardContainers to display cards
  const cardElements = props.cards.map((card, index) =>
    <CardContainer
      {...card}
      isSelectable={props.isSelectable}
      isBackFacing={index === 0 && !settingStore.isDealerHandVisible && props.player?.isNPC}
      isDescVisible={settingStore.isCardDescVisible}
    />
  );

  // Set toggle icon for Deck titles
  const toggleIcon = <Icon iconName={isDeckVisible ? "ChevronUp" : "ChevronDown"} />


  /* Deck Title */
  const deckTitleString = `${props.title} (${deckStore.deck.length})`;

  /* Hand Value (if it's a player deck) */
  let handValueString;
  if (props.player?.handValue.highest) {
    if (!props.player.isNPC || (props.player.isNPC && settingStore.isDealerHandVisible)) {
      handValueString = `Hand Value: ${props.player.handValue.aceAsOne} `;
      if (props.player.handValue.aceAsOne !== props.player.handValue.aceAsEleven) {
        handValueString += " / " + props.player.handValue.aceAsEleven;
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
      {props.player?.isNPC && (
        <Text variant="mediumPlus" nowrap block onClick={_toggleDeck}>
          {deckTitleString}&nbsp;{toggleIcon}
        </Text>
      )}
      {!props.player?.isNPC &&
        settingStore.isHandValueVisible && (
          <Text variant="large">{handValueString}</Text>
        )}
      <Stack horizontal horizontalAlign="start" tokens={tokens.cardStack} wrap>
        {isDeckVisible ? (cardElements) : nullRender}
      </Stack>
    </Stack>
  );
}
