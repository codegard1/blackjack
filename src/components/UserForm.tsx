// React
import React from "react";

// Fluent UI
import { Text, Stack, StackItem, Label, Dropdown, DropdownMenuItemType, TextField, DefaultButton, DefaultEffects } from '@fluentui/react';
import { MotionAnimations } from '@fluentui/theme';

// Local Resources
import { defaultPlayers } from "../definitions";

// Component
export const UserForm: React.FC = () => {

  // Ad-hod styles for the Stack
  const stackStyle = {
    boxShadow: DefaultEffects.elevation64,
    borderRadius: DefaultEffects.roundedCorner4,
    backgroundColor: 'ghostwhite',
    animation: MotionAnimations.slideUpIn,
    maxWidth: '40%'
  };

  const dropdownStyles = {
    dropdown: { width: '90%' },
  };

  const textFieldStyles = {
    root: { width: '90%' }
  };


  const options = [
    { key: 'defaultsHeader', text: 'Default Users', itemType: DropdownMenuItemType.Header },
    { key: 'chris', text: "Chris" },
    { key: 'dealer', text: "Dealer" },
    { key: 'divider_1', text: '-', itemType: DropdownMenuItemType.Divider },
    { key: 'customsHeader', text: 'Custom Users', itemType: DropdownMenuItemType.Header },
  ];

  const stackTokens = { childrenGap: 10, padding: 10 };

  return (
    <Stack tokens={stackTokens} style={stackStyle}>
      <StackItem shrink>
        <Dropdown placeholder="Select" label="Select existing user" options={options} styles={dropdownStyles}></Dropdown>
        <TextField label="User name" styles={textFieldStyles}></TextField>
      </StackItem>

      <StackItem shrink>
        <DefaultButton>Save</DefaultButton>
      </StackItem>
    </Stack>
  );
}
