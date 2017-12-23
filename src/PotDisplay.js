import React from "react";
import * as T from "prop-types";
import BaseComponent from "./BaseComponent";

class PotDisplay extends BaseComponent {
  static propTypes = {
    pot: T.number.isRequired
  };

  static defaultProps = {
    pot: 0
  };

  render() {
    return (
      <div className="ms-Grid-row">
        <div className="ms-Grid-col ms-s12">
          <p className="ms-font-xl" id="PotDisplay">
            Pot: ${this.props.pot}
          </p>
        </div>
      </div>
    );
  }
}

export default PotDisplay;
