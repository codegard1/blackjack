// React
import React from "react";

// Fluent UI
import { Callout, nullRender, mergeStyleSets, getTheme, FontWeights, DirectionalHint } from "@fluentui/react";

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

  // Styles for Callout
  const theme = getTheme();
  const styles = mergeStyleSets({
    callout: [
      theme.fonts.xLarge,
      {
        padding: '18px 24px 12px',
        maxWidth: 300,
        margin: 0,
        fontWeight: FontWeights.semilight,
      }
    ],
  });

  return hidden || !text ? nullRender() : (
    <Callout
      className={styles.callout}
      directionalHint={DirectionalHint.topAutoEdge}
      gapSpace={5}
      onDismiss={props.onHideCallout}
      role="alertdialog"
      target={props.target}
    >
      {text}
    </Callout>
  );
}

