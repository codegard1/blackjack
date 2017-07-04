import React, { Component } from "react";
import * as T from "prop-types";
import Masonry from "react-masonry-component";
import CardContainer from "./CardContainer";
import StatusDisplay from "./StatusDisplay";
import { Callout } from "office-ui-fabric-react/lib/Callout";

import "./DeckContainer.css";

export class DeckContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      deckIsVisible: true,
      isStatusCalloutVisible: false
    };

    this._toggleDeck = this._toggleDeck.bind(this);
    this._toggleStatusCallout = this._toggleStatusCallout.bind(this);
  }

  componentWillMount() {
    if (this.props.hidden === true) {
      this.setState({ deckIsVisible: false });
    }
  }

  _toggleStatusCallout() {
    this.setState({
      isStatusCalloutVisible: !this.state.isStatusCalloutVisible
    });
  }

  _toggleDeck() {
    this.setState({ deckIsVisible: !this.state.deckIsVisible });
  }

  render() {
    // Options passed into the Masonry component
    const masonryOptions = {
      transitionDuration: "0.3s",
      itemSelector: ".card",
      columnWidth: ".card",
      fitWidth: true
    };

    // Create CardContainers to display cards
    const childElements = this.props.deck
      ? this.props.deck.map(card => {
          return (
            <CardContainer
              key={card.suit + "-" + card.description}
              {...card}
              select={this.props.select}
              deselect={this.props.deselect}
              isSelectable={this.props.isSelectable}
            />
          );
        })
      : undefined;

    // Set toggle icon for Deck titles
    const toggleIcon = this.state.deckIsVisible
      ? <i
          className="ms-Icon ms-Icon--ChevronDown"
          aria-hidden="true"
          onClick={this._toggleDeck}
        />
      : <i
          className="ms-Icon ms-Icon--ChevronUp"
          aria-hidden="true"
          onClick={this._toggleDeck}
        />;

    const style = this.props.player && this.props.player.turn
      ? "DeckContainer selected"
      : "DeckContainer";

    const titleBar =
      this.props.player &&
      <span>
        {this.props.player.title}{" "}
        {` ($${this.props.player.bank}) `}{" "}
        Hand Value: {this.props.handValue.aceAsOne}
        {this.props.handValue.aceAsOne !== this.props.handValue.aceAsEleven &&
          " / " + this.props.handValue.aceAsEleven}
        {" "}
        <i
          className="ms-Icon ms-Icon--Info"
          onClick={this._toggleStatusCallout}
          ref={calloutTarget => this._statusCalloutTarget = calloutTarget}
        />
      </span>;

    return (
      <div className={style}>
        <h3 className="ms-font-s">
          {titleBar}
          {" "}
          {toggleIcon}
        </h3>
        {this.state.isStatusCalloutVisible &&
          <Callout
            gapSpace={1}
            targetElement={this._statusCalloutTarget}
            onDismiss={this._toggleStatusCallout}
            setInitialFocus={false}
          >
            <StatusDisplay
              player={this.props.player}
              gameStatus={this.props.gameStatus}
              turnCount={this.props.turnCount}
            />
          </Callout>}

        {this.state.deckIsVisible &&
          <Masonry
            className={"deck"}
            elementType={"div"}
            disableImagesLoaded={false}
            updateOnEachImageLoad={false} // default false and works only if disableImagesLoaded is false
            options={masonryOptions}
          >
            {childElements}
          </Masonry>}
      </div>
    );
  }
}

DeckContainer.propTypes = {
  select: T.func,
  deselect: T.func,
  deck: T.array,
  title: T.string,
  handValue: T.object,
  isSelectable: T.bool,
  hidden: T.bool,
  player: T.object,
  pot: T.number,
  gameStatus: T.number,
  turnCount: T.number
};

export default DeckContainer;
