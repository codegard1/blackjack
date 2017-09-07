import React from "react";
import * as T from "prop-types";
import Masonry from "react-masonry-component";

/* custom stuff */
import BaseComponent from "./BaseComponent";
import "./DeckContainer.css";
import CardContainer from "./CardContainer";

/* flux */
import AppActions from "./actions/AppActions";

class DeckContainer extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      isDeckVisible: true,
    };

    /* bind private methods */
    this._bind("_toggleDeck");
  }

  componentWillMount() {
    this.setState({
      isDeckVisible: !this.props.hidden,
    })


  }

  _toggleDeck() {
    this.setState({ isDeckVisible: !this.state.isDeckVisible });
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
    const childElements =
      this.props.deck && this.props.deck.length > 0
        ? this.props.deck.map(card =>
          <CardContainer
            key={card.suit + "-" + card.description}
            {...card}
            select={cardAttributes => AppActions.select(cardAttributes)}
            deselect={cardAttributes => AppActions.deselect(cardAttributes)}
            isSelectable={this.props.isSelectable}
          />
        )
        : [];

    // Set toggle icon for Deck titles
    const toggleIcon = this.state.isDeckVisible
      ? <i className="ms-Icon ms-Icon--ChevronUp" aria-hidden="true" />
      : <i className="ms-Icon ms-Icon--ChevronDown" aria-hidden="true" />;

    /* Deck Title */
    const deckTitleString = `${this.props.title} (${this.props.deck &&
      this.props.deck.length})`;

    /* Hand Value (if it's a player deck) */
    let handValueString = `Hand Value: ${this.props.handValue.aceAsOne} `;
    if (this.props.handValue.aceAsOne !== this.props.handValue.aceAsEleven) {
      handValueString += " / " + this.props.handValue.aceAsEleven;
    }


    return (
      <div className="DeckContainer">
        {!this.props.isPlayerDeck &&
          <span
            data-title={deckTitleString}
            className="ms-font-m"
            onClick={this._toggleDeck}
          >
            {toggleIcon}
          </span>}
        {this.props.isPlayerDeck &&
          <span
            data-title={handValueString}
            className="ms-font-l"></span>}
        {this.state.isDeckVisible &&
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

/* These props were verified on 8/21/17 */
DeckContainer.propTypes = {
  deck: T.array, // DeckStore
  gameStatus: T.number, // GameStore
  gameStatusFlag: T.bool.isRequired, // props 
  handValue: T.object, // DeckStore
  hidden: T.bool.isRequired, // props
  isSelectable: T.bool.isRequired, // props
  player: T.object, // GameStore
  title: T.string.isRequired, // props
  turnCount: T.number, // GameStore
};

export default DeckContainer;
