// React
import React from 'react';

// Local Resources
import { useGameContext, useSettingContext } from '../context';
import { GameAction } from '../enums';
import { ICardContainerProps } from '../interfaces';
import { cardBackClassNames, cardBackColorVariables } from '../theme';
import './CardContainer.css';
import { CARD_FLIP_MS } from './useCardFlip';


/**
 * One playing card, face up or face down. Colors come from the Fluent theme
 * through its CSS variables (see CardContainer.css). The face layout follows the
 * card style setting, and the back its pattern and color settings, unless they
 * are given as props. A flippable card keeps both faces, so a change of
 * isBackFacing turns it over with a CSS transition; any other card draws only the
 * face it shows.
 */
export const CardContainer: React.FC<ICardContainerProps> = (props) => {

  // Context
  const { gameDispatch } = useGameContext();
  const { settings } = useSettingContext();

  // Props
  const description = props.description;
  const cardTitle = props.sort.name;
  const cardIcon = props.suit.icon;
  const cardStyle = props.cardStyle ?? settings.cardStyle;
  const cardBackPattern = props.cardBackPattern ?? settings.cardBackPattern;
  const cardBackColor = props.cardBackColor ?? settings.cardBackColor;

  // State
  const [isSelected, setSelected] = React.useState<boolean>(false);

  const _toggleSelect = (): void => {
    gameDispatch({ type: !isSelected ? GameAction.Select : GameAction.Unselect, cardKey: props.id });
    setSelected(!isSelected);
  }

  const isRedSuit = props.suit.single === 'Heart' || props.suit.single === 'Diamond';
  const isFlippable = !!props.isFlippable;
  const className = [
    'playing-card',
    `is-style-${cardStyle}`,
    props.isBackFacing ? 'is-face-down' : '',
    isFlippable ? 'is-flippable' : '',
    isRedSuit ? 'is-red' : 'is-black',
    props.isSelectable ? 'is-selectable' : '',
    isSelected ? 'is-selected' : '',
  ].filter(Boolean).join(' ');

  const front = (
    <span className="playing-card-face is-face" aria-hidden="true">
      {cardStyle === 'classic' && <span className="playing-card-frame" aria-hidden="true" />}
      <span className="playing-card-corner playing-card-corner-top" aria-hidden="true">
        <span>{cardTitle}</span>
        <span>{cardIcon}</span>
      </span>
      <span className="playing-card-corner playing-card-corner-bottom" style={{ transform: 'rotate(180deg)' }} aria-hidden="true">
        <span>{cardTitle}</span>
        <span>{cardIcon}</span>
      </span>
      <span className="playing-card-center" aria-hidden="true">
        {cardStyle === 'bold' && <>
          <span className="playing-card-pip-index">{cardTitle}</span>
          <span className="playing-card-pip-suit">{cardIcon}</span>
        </>}
        {props.isDescVisible && <span className="playing-card-description">{description}</span>}
      </span>
    </span>
  );

  const back = (
    <span
      className={['playing-card-face', ...cardBackClassNames(cardBackPattern)].join(' ')}
      style={cardBackColorVariables(cardBackColor)}
      aria-hidden="true"
    />
  );

  // a flippable card keeps both faces on an inner layer that turns; any other draws just the one it shows
  const faces = <>{(isFlippable || !props.isBackFacing) && front}{(isFlippable || props.isBackFacing) && back}</>;

  return (
    <button
      type="button"
      aria-label={props.isBackFacing ? 'Face-down card' : `${description} of ${props.suit.plural}`}
      aria-pressed={props.isSelectable ? isSelected : undefined}
      onClick={props.isSelectable ? _toggleSelect : undefined}
      className={className}
      style={{
        animationDelay: `${(props.index ?? 0) * 90}ms`,
        ...(isFlippable ? { '--card-flip-ms': `${CARD_FLIP_MS}ms` } as React.CSSProperties : undefined),
      }}
    >
      {isFlippable ? <span className="playing-card-inner">{faces}</span> : faces}
    </button>
  );
}
