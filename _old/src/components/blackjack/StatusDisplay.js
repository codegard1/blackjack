import React from "react";
import * as T from "prop-types";
import { Stack, Callout, Text, Icon, mergeStyleSets, getTheme, FontWeights } from "@fluentui/react";

/* custom stuff */
import BaseComponent from "../BaseComponent";
import "./StatusDisplay.css";

class StatusDisplay extends BaseComponent {
  constructor(props) {
    super(props);

    this.state = {
      isCalloutVisible: false
    }

    this._bind("_toggleIsCalloutVisible");
  }

  static propTypes = {
    player: T.object.isRequired,
    stats: T.object.isRequired
  }

  _toggleIsCalloutVisible() {
    this.setState({ isCalloutVisible: !this.state.isCalloutVisible });
  }


  render() {
    let playerInfo = [],
      playerStats = [];

    for (const key in this.props.player) {
      if (this.props.player.hasOwnProperty(key)) {
        playerInfo.push(
          <li key={`statusdisplay-${key}`}>{`${key}: ${this.props.player[key]
            }`}</li>
        );
      }
    }

    for (const key in this.props.stats) {
      if (this.props.stats.hasOwnProperty(key)) {
        playerStats.push(
          <li key={`statusdisplay-${key}`}>{`${key}: ${this.props.stats[key]
            }`}</li>
        );
      }
    }

    const theme = getTheme();
    const styles = mergeStyleSets({
      buttonArea: {
        verticalAlign: 'top',
        display: 'inline-block',
        textAlign: 'center',
        // margin: '0 100px',
        // minWidth: 130,
        // height: 32,
      },
      callout: {
        maxWidth: 300,
      },
      header: {
        padding: '18px 24px 12px',
      },
      title: [
        theme.fonts.large,
        {
          margin: 0,
          fontWeight: FontWeights.semilight,
        },
      ],
      inner: {
        height: '100%',
        padding: '0 10px 20px',
      },
      subtext: [
        theme.fonts.small,
        {
          margin: 0,
          fontWeight: FontWeights.semilight,
        },
      ],
    });

    const labelId = `${this.props.player.title}-statsCalloutLabel`;
    const descriptionId = `${this.props.player.title}-statsCalloutDescription`;
    const targetClass = `InfoButton-${this.props.player.id}`

    return (
      <Stack.Item align="center">
        <Icon iconName="Info" onClick={this._toggleIsCalloutVisible} className={targetClass} />
        {this.state.isCalloutVisible &&
          <Callout
            ariaDescribedBy={descriptionId}
            ariaLabelledBy={labelId}
            className={styles.callout}
            gapSpace={0}
            onDismiss={this._toggleIsCalloutVisible}
            role="alertdialog"
            setInitialFocus
            target={`.${targetClass}`}
          >
            <div className={styles.header}>
              <Text className={styles.title} id={labelId}>
                Stats &amp; Variables
              </Text>
            </div>
            <div className={styles.inner}>
              <Text className={styles.subtext} id={descriptionId}>
                <ul className="playerStats">{playerStats}</ul>
                <ul className="playerInfo">{playerInfo}</ul>
              </Text>
            </div>
          </Callout>
        }
      </Stack.Item>
    );
  }
}

export default StatusDisplay;