// React
import React from "react";

import { Text } from '@fluentui/react-components';

import { useGameContext, useSettingContext } from '../context';

export const ActivityLog: React.FC = () => {

  // Context
  const { settings } = useSettingContext();
  const { gameState } = useGameContext();

  return !settings.isActivityLogVisible ? null : (
    <section id="ActivityLogRoot" className="activity-log">
      <Text size={500}>Activity Log</Text>
      <div className="activity-log-content">
        {gameState.activityLog.length === 0
          ? <Text size={300}>No activity yet</Text>
          : gameState.activityLog.map((item) => (
            <div key={item.id} className="activity-item">
              {item.name && <strong>{item.name} </strong>}
              {item.description}
              <time dateTime={new Date(item.timestamp).toISOString()}>
                {new Date(item.timestamp).toLocaleTimeString('en-US')}
              </time>
            </div>
          ))}
      </div>
    </section>
  );
}
