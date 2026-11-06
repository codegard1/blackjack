import React from "react";
import { Button, Popover, PopoverSurface, PopoverTrigger, Table, TableBody, TableCell, TableRow, Text } from '@fluentui/react-components';
import { Info24Regular } from '@fluentui/react-icons';

/* custom stuff */
import { IStatusDisplayProps } from "../interfaces";
import { summarizeStats } from "../functions/profiles";
import "./StatusDisplay.css";

export const StatusDisplay: React.FC<IStatusDisplayProps> = (props) => {

  // State
  const [isCalloutVisible, setCalloutVisible] = React.useState<boolean>(false);
  const summary = summarizeStats(props.player.stats);
  const statistics = [
    ['Rounds', summary.rounds],
    ['Won', summary.won],
    ['Lost', summary.lost],
    ['Pushed', summary.pushed],
    ['Win rate', summary.winRate === undefined ? '—' : `${Math.round(summary.winRate * 100)}%`],
    ['Blackjacks', summary.blackjacks],
    ['Busts', summary.busts],
    ['Winnings', `$${summary.winnings}`],
  ] as const;

  const labelId = `${props.player.title}-statsCalloutLabel`;
  const descriptionId = `${props.player.title}-statsCalloutDescription`;

  return (
    <Popover open={isCalloutVisible} onOpenChange={(_, data) => setCalloutVisible(data.open)}>
      <PopoverTrigger disableButtonEnhancement>
        <Button appearance="subtle" aria-label={`${props.player.title} stats`} icon={<Info24Regular />} />
      </PopoverTrigger>
      <PopoverSurface aria-labelledby={labelId} aria-describedby={descriptionId}>
        <Text id={labelId} weight="semibold">Statistics</Text>
        <Table id={descriptionId} aria-label={`${props.player.title} gameplay statistics`} size="small" className="status-display-content">
          <TableBody>
            {statistics.map(([label, value]) => (
              <TableRow key={label}>
                <TableCell>{label}</TableCell>
                <TableCell>{value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </PopoverSurface>
    </Popover>
  );
}
