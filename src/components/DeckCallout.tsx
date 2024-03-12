// React
import React from "react";

// Fluent UI
import { Callout, nullRender, mergeStyleSets, getTheme, FontWeights, DirectionalHint } from "@fluentui/react";

import { IDeckCalloutProps } from "../interfaces";

// Component
export const DeckCallout: React.FC<IDeckCalloutProps> = (props) => {

  // const {
  //   deck
  // } = React.useContext(AppContext);

  let text;
  const title = props.player.title;
  if (props.player.isStaying) text = `${title} stayed`;
  if (props.player.hasBlackJack) text = `${title} has blackjack`;
  if (props.player.isBusted) text = `${title} busted`;
  if (props.player.lastAction === "hit") text = `${title} hit`;

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

  return props.isDeckCalloutVisible && text ? (
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
  ) : nullRender();
}

