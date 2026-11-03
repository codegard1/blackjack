// React
import React from "react";

import { Text } from '@fluentui/react-components';

import { useGameContext, useSettingContext } from '../context';

export const ActivityLog: React.FC = () => {

  // Context
  const { settings } = useSettingContext();

  // State
  const [activityItems, setActivityItems] = React.useState<any>([]);
  const [nextKey, setNextKey] = React.useState<number>(1);

  const createActivityItems = () => {
    // memos for the loop 
    let datememo: string[] = [];
    let outputMemo: React.ReactElement[] = [];

    // Loop through ActivityItems
    const _items = activityItems.slice();
    _items.forEach((item: any, index: number, arr: any[]) => {

      // If the datememo does not contain the current item's timestamp
      // then add it as a Sticky and also add activity items from 
      // the same date

      // format the timestamp as a date string e.g. '11/18/2020'
      const datestamp = item.timestamp.toLocaleDateString('en-US');

      // Check if the datestamp is in the memo
      if (-1 === datememo.indexOf(datestamp)) {
        datememo.push(datestamp);
        // Push the date header
        outputMemo.push(<div key={`Sticky-${index}`} className="activity-date">{datestamp}</div>);

        const filteredItems = arr.filter(v => v.timestamp.toLocaleDateString('en-US') === datestamp);
        // Loop through the items that occurred on the same date as timestamp

        filteredItems.forEach((item1, index1) => {
          outputMemo.push(
            <div key={item1.key} className="activity-item">
              <strong>{item1.name}</strong> {item1.description}
              <time>{item1.timestamp.toLocaleTimeString('en-US')}</time>
            </div>
          );
        })
      }
    });

    return outputMemo;
  }

  return !settings.isActivityLogVisible ? null : (
    <section id="ActivityLogRoot" className="activity-log">
      <Text size={500}>Activity Log</Text>
      <div className="activity-log-content">
        {createActivityItems()}
      </div>
    </section>
  );
}
