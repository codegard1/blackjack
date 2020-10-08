import React from "react";
import * as T from "prop-types";
import { Text, Stack, DefaultEffects } from '@fluentui/react';
import { MotionAnimations } from '@fluentui/theme';

export default class UserForm extends React.Component {
  static propTypes = {
    textContent: T.string
  };

  static defaultProps = {
    textContent: "null"
  };

  render() {
    // Ad-hod styles for the Stack
    const stackStyle = {
      boxShadow: DefaultEffects.elevation64,
      borderRadius: DefaultEffects.roundedCorner4,
      backgroundColor: 'ghostwhite',
      animation: MotionAnimations.slideUpIn,
    };

    const stackTokens = { childrenGap: 10, padding: 10 };

    return (
      <Stack tokens={stackTokens} style={stackStyle}>
        <Text variant="small">{this.props.textContent}</Text>
      </Stack >
    );
  }
}
