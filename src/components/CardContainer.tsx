// React
import React from 'react';

// Local Resources
import { useGameContext } from '../context';
import { GameAction } from '../enums';
import { ICardContainerProps } from '../interfaces';


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
      style={{
        alignItems: 'flex-start',
        animation: 'card-enter 180ms ease-out',
        backgroundColor: props.isBackFacing ? '#d9e8f7' : '#f7f9fa',
        backgroundImage: props.isBackFacing ? 'radial-gradient(closest-side, transparent 98%, rgba(10, 10, 90, .3) 99%), radial-gradient(closest-side, transparent 98%, rgba(10, 10, 90, .3) 99%)' : undefined,
        backgroundPosition: props.isBackFacing ? '0 0, 40px 40px' : undefined,
        backgroundSize: props.isBackFacing ? '80px 80px' : undefined,
        border: isSelected ? '1px solid #0078d4' : '1px solid #ddd',
        borderRadius: 5,
        boxShadow: isSelected ? '4px 4px 10px rgba(25, 25, 25, 0.2)' : '2px 2px 2px rgba(25, 25, 25, 0.2)',
        color: isRedSuit ? '#c50f1f' : '#242424',
        cursor: props.isSelectable ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        height: 100,
        justifyContent: 'space-between',
        overflow: 'hidden',
        padding: 2,
        textAlign: 'left',
        width: 65,
      }}
    >
      {!props.isBackFacing && <span style={{ fontSize: 18, fontWeight: 600, whiteSpace: 'nowrap' }}>{props.isTitleVisible && cardTitle}{cardIcon}</span>}
      {!props.isBackFacing && props.isDescVisible && <span style={{ alignSelf: 'center', fontSize: 12, whiteSpace: 'nowrap' }}>{description}</span>}
    </button>
  );
}
