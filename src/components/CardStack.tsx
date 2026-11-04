// React
import React from 'react';

import { Button, Text } from '@fluentui/react-components';
import { ChevronDown16Regular, ChevronUp16Regular } from '@fluentui/react-icons';

/* custom stuff */
import { CardContainer } from '.';
import { useGameContext, useSettingContext } from '../context';
import { ICardStackProps } from '../interfaces';
import { GameStatus } from '../enums';
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
  const { gameState } = useGameContext();
  const isRoundOver = gameState.gameStatus === GameStatus.HumanWins || gameState.gameStatus === GameStatus.DealerWins || gameState.gameStatus === GameStatus.Push;

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
      index={index}
      isSelectable={isSelectable}
      isTitleVisible={settings.isCardTitleVisible}
      isBackFacing={index === 0 && !settings.isDealerHandVisible && !isRoundOver && player?.isNPC}
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
    <section aria-label={player ? `${player.title}'s hand` : undefined} style={{ alignItems: player ? 'center' : undefined, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '100%' }}>
      {!player && <Button
        appearance="transparent"
        icon={isDeckVisible ? <ChevronUp16Regular /> : <ChevronDown16Regular />}
        onClick={_toggleDeck}
        aria-expanded={isDeckVisible}
      >
        {deckTitleString}
      </Button>}
      {!player?.isNPC &&
        settings.isHandValueVisible && (
          <Text size={400}>{handValueString}</Text>
        )}
      {(player || isDeckVisible) && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: player ? 'center' : undefined }}>{cardElements}</div>}
    </section>
  );
}
