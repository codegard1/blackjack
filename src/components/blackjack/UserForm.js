import React from "react";
import * as T from "prop-types";
import { Text, Stack, Label, Dropdown, DropdownMenuItemType, TextField, DefaultButton, DefaultEffects } from '@fluentui/react';
import { MotionAnimations } from '@fluentui/theme';
import { defaultPlayers } from "./definitions";

export default class UserForm extends React.Component {
  // static propTypes = {
  // 
  // };

  // static defaultProps = {
  // 
  // };

  render() {
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
        <Stack.Item shrink>
          <Dropdown placeholder="Select" label="Select existing user" options={options} styles={dropdownStyles}></Dropdown>
          <TextField label="User name" styles={textFieldStyles}></TextField>
        </Stack.Item>

        <Stack.Item shrink>
          <DefaultButton shrink>Save</DefaultButton>
        </Stack.Item>
      </Stack >
    );
  }
}
