import { Callout, FontWeights, Icon, Stack, Text, getTheme, mergeStyleSets } from "@fluentui/react";
import React from "react";

/* custom stuff */
import { IStatusDisplayProps } from "../interfaces";
import "./StatusDisplay.css";

export const StatusDisplay: React.FC<IStatusDisplayProps> = (props) => {

  // State
  const [isCalloutVisible, setCalloutVisible] = React.useState<boolean>(false);

  const _toggleIsCalloutVisible = () => {
    setCalloutVisible(!isCalloutVisible);
  }


  let playerInfo = [],
    playerStats = [];

  for (const key in props.player) {
    if (props.player.hasOwnProperty(key)) {
      playerInfo.push(
        <li key={`statusdisplay-${key}`}>{`${key}: ${props.player[key]
          }`}</li>
      );
    }
  }

  for (const key in props.stats) {
    if (props.stats.hasOwnProperty(key)) {
      playerStats.push(
        <li key={`statusdisplay-${key}`}>{`${key}: ${props.stats[key]
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

  const labelId = `${props.player.title}-statsCalloutLabel`;
  const descriptionId = `${props.player.title}-statsCalloutDescription`;
  const targetClass = `InfoButton-${props.player.id}`

  return (
    <Stack.Item align="center">
      <Icon iconName="Info" onClick={_toggleIsCalloutVisible} className={targetClass} />
      {isCalloutVisible &&
        <Callout
          ariaDescribedBy={descriptionId}
          ariaLabelledBy={labelId}
          className={styles.callout}
          gapSpace={0}
          onDismiss={_toggleIsCalloutVisible}
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
