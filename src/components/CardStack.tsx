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
import AppContext from '../classes/AppContext';
import { SettingContext, SettingDispatchContext } from '../ctx';
import { ICardStackProps } from '../interfaces';

/**
 * A visual component that displays PlayingCards
 * @param props 
 * @returns 
 */
export const CardStack: React.FC<ICardStackProps> = (props) => {

  // Context props
  const settings = React.useContext(SettingContext);
  const {
    deck,
  } = React.useContext(AppContext);


  // State
  const [isDeckVisible, setVisible] = React.useState<boolean>(!props.hidden);

  const _toggleDeck = () => setVisible(!isDeckVisible);

  // Create CardContainers to display cards
  const cardElements = props.cards.map((card, index) =>
    <CardContainer
      {...card}
      isSelectable={props.isSelectable}
      isBackFacing={index === 0 && !settings.isDealerHandVisible && props.player?.isNPC}
      isDescVisible={settings.isCardDescVisible}
    />
  );

  // Set toggle icon for Deck titles
  const toggleIcon = <Icon iconName={isDeckVisible ? "ChevronUp" : "ChevronDown"} />


  /* Deck Title */
  const deckTitleString = `${props.title} (${deck?.length})`;

  /* Hand Value (if it's a player deck) */
  let handValueString;
  if (props.player?.handValue.highest) {
    if (!props.player.isNPC || (props.player.isNPC && settings.isDealerHandVisible)) {
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
        settings.isHandValueVisible && (
          <Text variant="large">{handValueString}</Text>
        )}
      <Stack horizontal horizontalAlign="start" tokens={tokens.cardStack} wrap>
        {isDeckVisible ? (cardElements) : nullRender}
      </Stack>
    </Stack>
  );
}
