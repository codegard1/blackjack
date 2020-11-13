import React from "react";
import * as T from "prop-types";
import { Callout, Icon, nullRender, mergeStyleSets, getTheme, FontWeights } from "@fluentui/react";

/* custom stuff */
import BaseComponent from "../BaseComponent";

class DeckCallout extends BaseComponent {
  static propTypes = {
    player: T.object.isRequired,
    isDeckCalloutVisible: T.bool.isRequired,
    onHideCallout: T.func.isRequired,
    target: T.string.isRequired,
  }

  render() {
    let text;
    const title = this.props.player.title;
    if (this.props.player.isStaying) text = `${title} stayed`;
    if (this.props.player.hasBlackJack) text = `${title} has blackjack`;
    if (this.props.player.isBusted) text = `${title} busted`;
    if (this.props.player.lastAction === "hit") text = `${title} hit`;

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


    return this.props.isDeckCalloutVisible && text ? (
      <Callout
        className={styles.callout}
        directionalHint="top"
        gapSpace={5}
        onDismiss={this.props.onHideCallout}
        role="alertdialog"
        target={this.props.target}
      >
        <Icon iconName="alert" />
        {text}
      </Callout>
    ) : nullRender();
  }
}

export default DeckCallout;