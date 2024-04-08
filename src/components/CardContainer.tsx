// React
import React from 'react';

// Fluent UI
import {
  DefaultPalette, mergeStyles, Stack, StackItem, Text,
} from '@fluentui/react';
import {
  MotionAnimations,
} from '@fluentui/theme';

// Local Resources
import { useGameContext } from '../context';
import { GameAction } from '../enums';
import { ICardContainerProps } from '../interfaces';


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

  // Context
  const { gameDispatch } = useGameContext();

  // State
  const [isSelected, setSelected] = React.useState<boolean>(false);
  const description = props.description + ' of ' + props.suit.plural;
  const cardTitle = props.sort.name;
  const cardIcon = props.suit.icon;

  const _toggleSelect = (): void => {
    if (!isSelected) {
      console.log('cardKey', props)
      gameDispatch({ type: GameAction.Select, cardKey: props.key });
      setSelected(true);
    } else {
      gameDispatch({ type: GameAction.Unselect, cardKey: props.key });
      setSelected(false);
    }
  }

  // Determine styles 
  const cardStylesBySuit: { [index: string]: any } = {
    'Heart': cardStyles.hearts,
    'Spade': cardStyles.spades,
    'Diamond': cardStyles.diamonds,
    'Club': cardStyles.clubs,
  }
  const suitKey: string = props.suit.single
  const cardTitleClassName = cardStylesBySuit[suitKey];

  let cardClassNames = [cardTitleClassName, cardStyles.root];
  if (props.isBackFacing) cardClassNames.push([cardStyles.root, cardStyles.backFacing])
  else cardClassNames.push(cardStyles.root, cardStyles.frontFacing);

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
    </Stack>
  );
}
