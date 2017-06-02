import React, { Component } from "react";
import Masonry from "react-masonry-component";
import CardContainer from "./CardContainer";

export class DeckContainer extends Component {
  constructor(props) {
    super(props);
    this.state = { deckIsVisible: true };

    this._toggleDeck = this._toggleDeck.bind(this);
  }

  _toggleDeck() {
    this.setState({ deckIsVisible: !this.state.deckIsVisible });
  }

  render() {
    const masonryOptions = {
      transitionDuration: "0.2s"
    };
    const childElements = this.props.deck
      ? this.props.deck.map((card, index) => {
          return (
            <CardContainer
              key={card.suit + "-" + card.description}
              {...card}
              select={this.props.select}
              deselect={this.props.deselect}
            />
          );
        })
      : undefined;
    const toggleIcon = this.state.deckIsVisible
      ? <i className="ms-Icon ms-Icon--ChevronDownMed" />
      : <i className="ms-Icon ms-Icon--ChevronUpMed" />;

    return (
      <div id="DeckContainer">
        <h3 className="ms-font-xl" onClick={this._toggleDeck}>
          {this.props.title} &nbsp;
          {toggleIcon}
        </h3>
        {this.state.deckIsVisible &&
          <Masonry
            className={"deck"}
            elementType={"div"}
            options={masonryOptions}
            disableImagesLoaded={false}
            updateOnEachImageLoad={false} // default false and works only if disableImagesLoaded is false
          >
            {childElements}
          </Masonry>}
      </div>
    );
  }
}

export default DeckContainer;
