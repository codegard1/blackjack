// React
import React from 'react';

// Fluent UI
import {
  Icon,
  Stack,
  Text,
  nullRender
} from "@fluentui/react";

/* custom stuff */
import { CardContainer } from '.';
import { useGameContext, useSettingContext } from '../context';
import { ICardStackProps } from '../interfaces';
import { handValue } from '../functions';
import { PlayingCard } from '../classes';


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

/**
 * A visual component that displays PlayingCards
 * @param props 
 * @returns 
 */
export const CardStack: React.FC<ICardStackProps> = (props) => {

  const {
    cards,
    hidden,
    isSelectable,
    player,
    title,
  } = props;

  // Context props
  const { settings } = useSettingContext();

  // State
  const [isDeckVisible, setVisible] = React.useState<boolean>(true);
  const _toggleDeck = () => setVisible(!isDeckVisible);

  // Computed values
  const handValues = handValue(cards);

  // Create CardContainers to display cards
  const cardElements = cards.map((cardKey, index) =>
    <CardContainer
      {...new PlayingCard(cardKey)}
      key={`cardContainer-${cardKey}-${index}`}
      id={cardKey}
      isSelectable={isSelectable}
      isBackFacing={index === 0 && !settings.isDealerHandVisible && player?.isNPC}
      isDescVisible={settings.isCardDescVisible}
    />
  );

  /* Deck Title */
  const deckTitleString = `${title} (${cards.length})`;

  /* Hand Value (if it's a player deck) */
  const handValueString = (handValues.aceAsEleven === handValues.aceAsOne) ?
    `Hand Value: ${handValues.highest}` :
    `Hand Value: ${handValues.aceAsOne} / ${handValues.aceAsEleven}`;

  return hidden ? nullRender() : (
    <Stack verticalAlign="stretch" tokens={tokens.sectionStack}>
      <Text variant="mediumPlus" nowrap block onClick={_toggleDeck}>
        {deckTitleString}&nbsp;<Icon iconName={isDeckVisible ? "ChevronUp" : "ChevronDown"} />
      </Text>
      {!player?.isNPC &&
        settings.isHandValueVisible && (
          <Text variant="large">{handValueString}</Text>
        )}
      <Stack horizontal horizontalAlign="start" tokens={tokens.cardStack} wrap>
        {isDeckVisible ? (cardElements) : nullRender}
      </Stack>
    </Stack>
  );
}
