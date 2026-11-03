import React from "react";
import { Button, Popover, PopoverSurface, PopoverTrigger, Text } from '@fluentui/react-components';
import { Info24Regular } from '@fluentui/react-icons';

/* custom stuff */
import { IStatusDisplayProps } from "../interfaces";
import "./StatusDisplay.css";

export const StatusDisplay: React.FC<IStatusDisplayProps> = (props) => {

  // State
  const [isCalloutVisible, setCalloutVisible] = React.useState<boolean>(false);

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

  const labelId = `${props.player.title}-statsCalloutLabel`;
  const descriptionId = `${props.player.title}-statsCalloutDescription`;

  return (
    <Popover open={isCalloutVisible} onOpenChange={(_, data) => setCalloutVisible(data.open)}>
      <PopoverTrigger disableButtonEnhancement>
        <Button appearance="subtle" aria-label={`${props.player.title} stats`} icon={<Info24Regular />} />
      </PopoverTrigger>
      <PopoverSurface aria-labelledby={labelId} aria-describedby={descriptionId}>
        <Text id={labelId} weight="semibold">Stats &amp; Variables</Text>
        <div id={descriptionId} className="status-display-content">
          <ul className="playerStats">{playerStats}</ul>
          <ul className="playerInfo">{playerInfo}</ul>
        </div>
      </PopoverSurface>
    </Popover>
  );
}
