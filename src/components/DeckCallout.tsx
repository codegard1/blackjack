// React
import React from "react";

import { tokens } from '@fluentui/react-components';

import { IDeckCalloutProps } from "../interfaces";
import { PlayerAction } from "../enums";

// Component
export const DeckCallout: React.FC<IDeckCalloutProps> = (props) => {

  // Props
  const { player, onHideCallout, hidden, target } = props;

  // Computed props
  const { title, isBlackjack, isStaying, isBusted, lastAction } = player;
  let text;
  if (isStaying) text = `${title} stayed`;
  if (isBlackjack) text = `${title} has blackjack`;
  if (isBusted) text = `${title} busted`;
  if (lastAction === PlayerAction.Hit) text = `${title} hit`;

  return hidden || !text ? null : (
    <div
      className="deck-callout"
      onClick={props.onHideCallout}
      role="status"
      style={{ background: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground1, borderRadius: tokens.borderRadiusMedium, boxShadow: tokens.shadow8, fontSize: 20, maxWidth: 300, padding: '12px 18px' }}
    >
      {text}
    </div>
  );
}

