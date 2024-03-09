import React from "react";
import * as T from "prop-types";
import { Stack, Callout, Text, Icon, mergeStyleSets, getTheme, FontWeights } from "@fluentui/react";

/* custom stuff */
import BaseComponent from "../BaseComponent";

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
      let val = this.props.player[key];

      switch (typeof this.props.player[key]) {
        case 'object':
          val = JSON.stringify(val);
          break;

        case 'boolean':
          val = val ? 'Yes' : 'No';
          break;

        default:
          break;
      }

      playerInfo.push(
        <li key={`statusdisplay-${this.props.player.key}-${key}`}>
          <strong>{key}</strong>:&nbsp;&nbsp;{val}
        </li>
      );
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
      callout: {
        padding: '5px',
      },
      title: [
        theme.fonts.large,
        {
          margin: 0,
          fontWeight: FontWeights.semilight,
        },
      ],
      subtext: [
        theme.fonts.small,
        {
          margin: 0,
          fontWeight: FontWeights.semilight,
        },
      ],
      nakedList: [
        {
          margin: 0,
          listStyleType: 'none',
          padding: 0,
        }
      ]
    });

    const labelId = `${this.props.player.title}-statsCalloutLabel`;
    const descriptionId = `${this.props.player.title}-statsCalloutDescription`;
    const targetClass = `InfoButton-${this.props.player.key}`

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
            <Text className={styles.subtext} id={descriptionId}>

              <ul className={styles.nakedList}>{playerStats}</ul>
              <ul className={styles.nakedList}>{playerInfo}</ul>
            </Text>
          </Callout>
        }
      </Stack.Item>
    );
  }
}

export default StatusDisplay;