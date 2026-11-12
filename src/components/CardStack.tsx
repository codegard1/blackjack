// React
import React from 'react';

import { Button, Text } from '@fluentui/react-components';
import { ChevronDown16Regular, ChevronUp16Regular } from '@fluentui/react-icons';

/* custom stuff */
import { CardContainer } from '.';
import { useGameContext, useSettingContext } from '../context';
import { ICardStackProps } from '../interfaces';
import { handValue, isDealer, isHoleCardHidden } from '../functions';
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
    variant = 'seat',
  } = props;
  const isMini = variant === 'mini';

  // Context props
  const { settings } = useSettingContext();
  const { gameState } = useGameContext();
  // only the dealer's first card, the hole card, is dealt face down; players' cards are face up
  const hasHoleCard = isDealer(player);
  const isHoleHidden = isHoleCardHidden(player, settings.isDealerHandVisible, gameState.gameStatus);

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
      isBackFacing={index === 0 && isHoleHidden}
      isFlippable={index === 0 && hasHoleCard}
      isDescVisible={settings.isCardDescVisible}
    />
  );

  /* Deck Title */
  const deckTitleString = `${title} (${cards.length})`;

  /* Hand Value (if it's a player deck) */
  const handValueString = (handValues.aceAsEleven === handValues.aceAsOne) ?
    `Hand Value: ${handValues.highest}` :
    `Hand Value: ${handValues.aceAsOne} / ${handValues.aceAsEleven}`;
  const canRevealTotal = !isHoleHidden;
  const showHandValue = settings.isHandValueVisible && !hasHoleCard;

  return hidden ? null : (
    <section aria-label={player ? `${player.title}'s hand` : undefined} style={{ alignItems: player ? 'center' : undefined, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '100%', width: player && !isMini ? '100%' : undefined }}>
      {!player && <Button
        appearance="transparent"
        icon={isDeckVisible ? <ChevronUp16Regular /> : <ChevronDown16Regular />}
        onClick={_toggleDeck}
        aria-expanded={isDeckVisible}
      >
        {deckTitleString}
      </Button>}
      {!isMini && canRevealTotal && (
        showHandValue
          ? <Text size={400}>{handValueString}</Text>
          : <span className="visually-hidden">{handValueString}</span>
      )}
      {(player || isDeckVisible) && (
        player
          ? <div className={isMini ? 'card-row is-mini' : 'card-row'} style={{ '--card-count': Math.max(cards.length, 1) } as React.CSSProperties}>{cardElements}</div>
          : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{cardElements}</div>
      )}
    </section>
  );
}
