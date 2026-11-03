// React
import React from 'react';

import { Button, Text } from '@fluentui/react-components';
import { ChevronDown16Regular, ChevronUp16Regular } from '@fluentui/react-icons';

/* custom stuff */
import { CardContainer } from '.';
import { useGameContext, useSettingContext } from '../context';
import { ICardStackProps } from '../interfaces';
import { handValue } from '../functions';
import { PlayingCard } from '../classes';


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
      isTitleVisible={settings.isCardTitleVisible}
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

  return hidden ? null : (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Button
        appearance="transparent"
        icon={isDeckVisible ? <ChevronUp16Regular /> : <ChevronDown16Regular />}
        onClick={_toggleDeck}
        aria-expanded={isDeckVisible}
      >
        {deckTitleString}
      </Button>
      {!player?.isNPC &&
        settings.isHandValueVisible && (
          <Text size={400}>{handValueString}</Text>
        )}
      {isDeckVisible && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{cardElements}</div>}
    </section>
  );
}
