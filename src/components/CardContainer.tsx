// React
import * as React from 'react';

// Fluent UI
import {
  DefaultPalette,
  mergeStyles,
  Stack,
  StackItem,
  Text,
} from '@fluentui/react';
import {
  MotionAnimations,
} from '@fluentui/theme';

// Local Resources
import { ICardContainerProps } from '../interfaces';
import { Suit, SuitKey, SuitCollection, SuitCollectionKey } from '../types';

// Fluent UI styles
const cardStyles = {
  root: {
    animation: MotionAnimations.slideUpIn,
    height: 100,
    overflow: 'hidden',
    width: 65,
    borderRadius: '5px',
    padding: '2px'
  },
  cardTitleTop: {
    // border: '1px solid orange',
  },
  cardTitleBottom: {
    // border: '1px solid green',
  },
  cardDescription: {
    textAlign: 'center',
    fontWeight: 'light',
  },
  hearts: { color: DefaultPalette.red },
  diamonds: { color: DefaultPalette.red },
  spades: { color: DefaultPalette.neutralDark },
  clubs: { color: DefaultPalette.neutralDark },
  selectable: { cursor: 'pointer' },
  unselectable: { cursor: 'default' },
  unselected: {
    boxShadow: '2px 2px 2px rgba(25, 25, 25, 0.2)',
    border: '1px solid #ddd',
  },
  selected: {
    border: '1px solid' + DefaultPalette.blue,
    boxShadow: '4px 4px 10px rgba(25, 25, 25, 0.2)',
  },
  frontFacing: {
    backgroundColor: DefaultPalette.neutralLighterAlt,
  },
  backFacing: {
    backgroundColor: DefaultPalette.blueLight,
    backgroundImage: 'radial-gradient(closest-side, transparent 98%, rgba(10, 10, 90, .3) 99%), radial-gradient(closest-side, transparent 98%, rgba(10, 10, 90, .3) 99%)',
    backgroundSize: '80px 80px',
    backgroundPosition: '0 0, 40px 40px',
  }
};

export const CardContainer: React.FC<ICardContainerProps> = (props) => {

  // State
  const [isSelected, setSelected] = React.useState<boolean>(false);

  const _toggleSelect = (): void => {
    const cardAttributes = {
      description: props.description,
      suit: props.suit,
      sort: props.sort
    };
    if (!isSelected) {
      // props.select(cardAttributes);
      setSelected(true);
    } else {
      // props.deselect(cardAttributes);
      setSelected(false);
    }
  }

  const description = props.description + ' of ' + props.suit.plural;
  const cardTitle = props.sort.name;
  const cardIcon = props.suit.icon;

  // Determine styles 
  const cardStylesBySuit: SuitCollection = {
    'Heart': cardStyles.hearts,
    'Spade': cardStyles.spades,
    'Diamond': cardStyles.diamonds,
    'Club': cardStyles.clubs,
  }
  const suitKey: SuitKey = props.suit.single
  const cardTitleClassName: SuitCollectionKey = cardStylesBySuit[suitKey];

  let cardClassNames = [cardTitleClassName];
  if (props.isBackFacing) cardClassNames.push([cardStyles.root, cardStyles.backFacing])
  else cardClassNames.push([cardStyles.root, cardStyles.frontFacing]);

  if (props.isSelectable) cardClassNames.push(cardStyles.selectable)
  else cardClassNames.push(cardStyles.unselectable);

  if (isSelected) cardClassNames.push(cardStyles.selected)
  else cardClassNames.push(cardStyles.unselected);


  return (
    <Stack
      verticalAlign='space-between'
      className={mergeStyles(cardClassNames)}
      onClick={props.isSelectable ? _toggleSelect : undefined}
    >
      {!props.isBackFacing &&
        <StackItem align='start' >
          <Text variant='large' block nowrap className={mergeStyles(cardTitleClassName, cardStyles.cardTitleTop)} >
            {cardTitle}{cardIcon}
          </Text>
        </StackItem>
      }

      {
        !props.isBackFacing && props.isDescVisible &&
        <Stack.Item>
          <Text variant='small' block nowrap className={mergeStyles(cardStyles.cardDescription)}>
            {description}
          </Text>
        </Stack.Item>
      }

      {
        !props.isBackFacing &&
        <Stack.Item align='end' >
          <Text variant='large' block nowrap className={mergeStyles(cardTitleClassName, cardStyles.cardTitleTop)} >
            {cardTitle}{cardIcon}
          </Text>
        </Stack.Item>
      }
    </Stack>
  );
}
