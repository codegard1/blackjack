import React, { Component } from "react";
import * as T from "prop-types";
import { Panel, PanelType } from "office-ui-fabric-react/lib/Panel";

export function OptionsPanel(props) {
  return (
    <Panel
      id="OptionsPanel"
      isOpen={props.isOptionsPanelVisible}
      onDismiss={props.hide}
      type={PanelType.smallFixedNear}
      headerText="Options"
      isLightDismiss
    >
      Content goes here!
    </Panel>
  );
}

OptionsPanel.propTypes = {
  isOptionsPanelVisible: T.bool.isRequired,
  hide: T.func.isRequired
};

export default OptionsPanel;
