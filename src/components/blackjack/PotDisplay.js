import React from "react";
import * as T from "prop-types";
import { Text } from '@fluentui/react';

export default class PotDisplay extends React.Component {
  static propTypes = {
    pot: T.number.isRequired
  };

  static defaultProps = {
    pot: 0
  };

  render() {
    return (
      <Text block nowrap variant="xLarge">
        Pot: ${this.props.pot}
      </Text>
    );
  }
}
