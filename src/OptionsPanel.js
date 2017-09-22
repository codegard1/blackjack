import React from "react";
import * as T from "prop-types";
import { Panel, PanelType } from "office-ui-fabric-react/lib/Panel";
import { Toggle } from "office-ui-fabric-react/lib/Toggle";
import { CommandButton } from "office-ui-fabric-react/lib/Button";

/* custom stuff */
import './OptionsPanel.css';
import BaseComponent from './BaseComponent';

/* Flux */
import AppActions from "./actions/AppActions";
import ControlPanelStore from './stores/ControlPanelStore';

class OptionsPanel extends BaseComponent {
  constructor(props) {
    super(props);

    this.state = {}

    this._bind(
      "newDeal",
      "onChangeControlPanel",
      "resetGame"
    )
  }

  componentDidMount() {
    /* add change listener */
    ControlPanelStore.addChangeListener(this.onChangeControlPanel);
    this.onChangeControlPanel();
  }

  componentWillUnmount() {
    /* remove change listener */
    ControlPanelStore.removeChangeListener(this.onChangeControlPanel);
  }

  static propTypes = {
    isOptionsPanelVisible: T.bool.isRequired,
    isDeckVisible: T.bool.isRequired,
    isDrawnVisible: T.bool.isRequired,
    isSelectedVisible: T.bool.isRequired
  };

  resetGame() {
    AppActions.reset();
    AppActions.newDeck();
    AppActions.showMessageBar("Game Reset");
    AppActions.hideOptionsPanel();
  }

  newDeal() {
    AppActions.deal();
    AppActions.hideOptionsPanel();
  }

  onChangeControlPanel() {
    const newState = ControlPanelStore.getState();
    this.setState({ ...newState });
  }

  render() {
    return (
      <Panel
        id="OptionsPanel"
        isOpen={this.props.isOptionsPanelVisible}
        onDismiss={AppActions.hideOptionsPanel}
        type={PanelType.smallFixedNear}
        headerText="Options"
        isLightDismiss
      >
        <div id="ButtonColumn">
          <CommandButton
            iconProps={{ iconName: "StackIndicator" }}
            disabled={false}
            checked={false}
            onClick={this.newDeal}
          >
            Deal
        </CommandButton>

          <CommandButton
            iconProps={{ iconName: "Refresh" }}
            disabled={false}
            checked={false}
            onClick={this.resetGame}
          >
            Reset Game
        </CommandButton>

          <CommandButton
            iconProps={{ iconName: "Sync" }}
            disabled={false}
            checked={false}
            onClick={AppActions.shuffle}
          >
            Shuffle Deck
        </CommandButton>

          <Toggle
            checked={this.props.isDeckVisible}
            label="Show Deck"
            onAriaLabel="The deck is visible. Pres to hide it."
            offAriaLabel="The deck is not visible. Press to show it."
            onText="On"
            offText="Off"
            onChanged={checked => AppActions.toggleDeckVisibility(checked)}
            value
          />
          <Toggle
            checked={this.props.isDrawnVisible}
            label="Show Drawn"
            onAriaLabel="The Drawn cards are visible. Pres to hide it."
            offAriaLabel="The Drawn cards are not visible. Press to show it."
            onText="On"
            offText="Off"
            onChanged={checked => AppActions.toggleDrawnVisibility(checked)}
          />
          <Toggle
            checked={this.props.isSelectedVisible}
            label="Show Selected"
            onAriaLabel="The Selected cards are visible. Pres to hide it."
            offAriaLabel="The Selected cards are not visible. Press to show it."
            onText="On"
            offText="Off"
            onChanged={checked => AppActions.toggleSelectedVisibility(checked)}
          />
          <Toggle
            checked={this.props.isDealerHandVisible}
            label="Show Dealer Hand"
            onAriaLabel="The dealer's hand is visible. Press to hide it."
            offAriaLabel="The dealer's hand is not visible. Press to show it."
            onText="On"
            offText="Off"
            onChanged={checked => AppActions.toggleDealerHandVisibility(checked)}
          />
          <Toggle
            checked={this.props.isHandValueVisible}
            label="Show Hand Value"
            onAriaLabel="The hand value display is visible. Press to hide it."
            offAriaLabel="The hand value display is hidden. Press to show it."
            onText="On"
            offText="Off"
            onChanged={checked => AppActions.toggleHandValueVisibility(checked)}
          />
        </div>
      </Panel >
    );
  }
}

export default OptionsPanel;
