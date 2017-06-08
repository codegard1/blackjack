import React, { Component } from "react";
import * as T from "prop-types";
import Masonry from "react-masonry-component";
import CardContainer from "./CardContainer";

export class DeckContainer extends Component {
  constructor(props) {
    super(props);
    this.state = { deckIsVisible: true };

    this._toggleDeck = this._toggleDeck.bind(this);
  }

  componentWillMount() {
    if (this.props.hidden === true) {
      this.setState({ deckIsVisible: false });
    }
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
      ? this.props.deck.map((card, index) => {
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
      ? <i className="ms-Icon ms-Icon--ChevronDownMed" />
      : <i className="ms-Icon ms-Icon--ChevronUpMed" />;

    // Set hand value text
    const handValueDisplay =
      this.props.handValue &&
      <span className="handValue ms-font-xl">
        Hand Value: {this.props.handValue.aceAsOne}
        {this.props.handValue.aceAsOne !== this.props.handValue.aceAsTen &&
          " / " + this.props.handValue.aceAsTen}
      </span>;

    return (
      <div className="DeckContainer">
        <h3 className="ms-font-xl" onClick={this._toggleDeck}>
          {this.props.title} &nbsp;
          {toggleIcon}
        </h3>
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
        {handValueDisplay}
      </div>
    );
  }
}

DeckContainer.propTypes = {
  deck: T.array,
  title: T.string,
  handValue: T.object,
  select: T.func,
  deselect: T.func,
  hidden: T.bool
};

export default DeckContainer;
