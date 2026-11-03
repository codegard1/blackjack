// React
import React from "react";

import { Button, Dropdown, Field, Input, Option, Text } from '@fluentui/react-components';

// Local Resources
import { defaultplayersArr } from "../definitions";

// Component
export const UserForm: React.FC = () => {
  return (
    <div style={{ backgroundColor: 'ghostwhite', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: '40%', padding: 10 }}>
      <Field label="Select existing user">
        <Dropdown placeholder="Select">
          {defaultplayersArr.map((player) => (
            <Option key={player.key} value={player.key}>{player.title}</Option>
          ))}
        </Dropdown>
      </Field>
      <Field label="User name"><Input /></Field>
      <Button appearance="primary">Save</Button>
      <Text size={200}>{defaultplayersArr.length} default players</Text>
    </div>
  );
}
