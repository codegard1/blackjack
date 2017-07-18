import React, { Component } from "react";
import * as T from "prop-types";
import { Panel, PanelType } from "office-ui-fabric-react/lib/Panel";
import { Toggle } from "office-ui-fabric-react/lib/Toggle";
import { CommandButton, IButtonProps } from "office-ui-fabric-react/lib/Button";

import { BaseComponent } from "./BaseComponent";

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
      <CommandButton
        iconProps={{ iconName: "Refresh" }}
        disabled={false}
        checked={false}
        onClick={props.resetGame}
      >
        Reset Game
      </CommandButton>

      <Toggle
        defaultChecked={true}
        label="Show Deck"
        onAriaLabel="The deck is visible. Pres to hide it."
        offAriaLabel="The deck is not visible. Press to show it."
        onText="On"
        offText="Off"
        onChanged={checked => props.toggleDeckVisibility(checked)}
      />
      <Toggle
        defaultChecked={false}
        label="Show Drawn"
        onAriaLabel="The Drawn cards are visible. Pres to hide it."
        offAriaLabel="The Drawn cards are not visible. Press to show it."
        onText="On"
        offText="Off"
        onChanged={checked => props.toggleDrawnVisibility(checked)}
      />
      <Toggle
        defaultChecked={false}
        label="Show Selected"
        onAriaLabel="The Selected cards are visible. Pres to hide it."
        offAriaLabel="The Selected cards are not visible. Press to show it."
        onText="On"
        offText="Off"
        onChanged={checked => props.toggleSelectedVisibility(checked)}
      />
    </Panel>
  );
}

OptionsPanel.propTypes = {
  isOptionsPanelVisible: T.bool.isRequired,
  hide: T.func.isRequired,
  toggleDeckVisibility: T.func,
  toggleSelectedVisibility: T.func,
  toggleDrawnVisibility: T.func,
  resetGame: T.func
};

export default OptionsPanel;
