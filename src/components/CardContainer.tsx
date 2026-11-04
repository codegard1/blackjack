// React
import React from 'react';

// Local Resources
import { useGameContext } from '../context';
import { GameAction } from '../enums';
import { ICardContainerProps } from '../interfaces';
import './CardContainer.css';


export const CardContainer: React.FC<ICardContainerProps> = (props) => {

  // Context
  const { gameDispatch } = useGameContext();

  // Props
  const description = props.description;
  const cardTitle = props.sort.name;
  const cardIcon = props.suit.icon;

  // State
  const [isSelected, setSelected] = React.useState<boolean>(false);

  const _toggleSelect = (): void => {
    gameDispatch({ type: !isSelected ? GameAction.Select : GameAction.Unselect, cardKey: props.id });
    setSelected(!isSelected);
  }

  const isRedSuit = props.suit.single === 'Heart' || props.suit.single === 'Diamond';

  return (
    <button
      type="button"
      aria-label={`${description} of ${props.suit.plural}`}
      aria-pressed={props.isSelectable ? isSelected : undefined}
      onClick={props.isSelectable ? _toggleSelect : undefined}
      className={`playing-card${isSelected ? ' is-selected' : ''}`}
      style={{
        animationDelay: `${(props.index ?? 0) * 90}ms`,
        alignItems: 'flex-start',
        backgroundColor: props.isBackFacing ? '#d9e8f7' : '#f7f9fa',
        backgroundImage: props.isBackFacing ? 'radial-gradient(closest-side, transparent 98%, rgba(10, 10, 90, .3) 99%), radial-gradient(closest-side, transparent 98%, rgba(10, 10, 90, .3) 99%)' : undefined,
        backgroundPosition: props.isBackFacing ? '0 0, 40px 40px' : undefined,
        backgroundSize: props.isBackFacing ? '80px 80px' : undefined,
        border: isSelected ? '1px solid #0078d4' : '1px solid #e0e0e0',
        borderRadius: 8,
        color: isRedSuit ? '#c50f1f' : '#242424',
        cursor: props.isSelectable ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: 0,
        position: 'relative',
        textAlign: 'left',
      }}
    >
      <span className="playing-card-frame" aria-hidden="true" />
      {!props.isBackFacing && <>
        <span className="playing-card-corner playing-card-corner-top" aria-hidden="true">
          {props.isTitleVisible && <span>{cardTitle}</span>}
          <span>{cardIcon}</span>
        </span>
        <span className="playing-card-corner playing-card-corner-bottom" style={{ transform: 'rotate(180deg)' }} aria-hidden="true">
          {props.isTitleVisible && <span>{cardTitle}</span>}
          <span>{cardIcon}</span>
        </span>
      </>}
      {!props.isBackFacing && props.isDescVisible && <span className="playing-card-description">{description}</span>}
    </button>
  );
}
