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
      isDeckVisible: true
    };

    /* bind private methods */
    this._bind("_toggleDeck");
  }

  static propTypes = {
    // gameStatusFlag: T.bool.isRequired, // props
    deck: T.array, // DeckStore
    gameStatus: T.number, // GameStore
    handValue: T.object, // DeckStore
    hidden: T.bool.isRequired, // props
    isCardDescVisible: T.bool, // ControlPanelStore
    isDealerHandVisible: T.bool, // ControlPanelStore 
    isHandValueVisible: T.bool, // ControlPanelStore
    isNPC: T.bool, // props
    isPlayerDeck: T.bool,
    isSelectable: T.bool.isRequired, // props
    player: T.object, // GameStore
    title: T.string.isRequired, // props
    turnCount: T.number, // GameStore
  };

  componentWillMount() {
    this.setState({
      isDeckVisible: !this.props.hidden
    });
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
    let cardElements = [];
    if (this.props.deck && this.props.deck.length > 0) {
      cardElements = this.props.deck.map((card, index) => (
        <CardContainer
          key={card.suit + "-" + card.description}
          {...card}
          select={cardAttributes => AppActions.select(cardAttributes)}
          deselect={cardAttributes => AppActions.deselect(cardAttributes)}
          isSelectable={this.props.isSelectable}
          isBackFacing={index === 0 && !this.props.isDealerHandVisible && this.props.isNPC}
          isDescVisible={this.props.isCardDescVisible}
        />
      ))
    }

    // Set toggle icon for Deck titles
    const toggleIcon = this.state.isDeckVisible ? (
      <i className="ms-Icon ms-Icon--ChevronUp" aria-hidden="true" />
    ) : (
        <i className="ms-Icon ms-Icon--ChevronDown" aria-hidden="true" />
      );

    /* Deck Title */
    const deckTitleString = `${this.props.title} (${this.props.deck &&
      this.props.deck.length})`;

    /* Hand Value (if it's a player deck) */
    let handValueString;
    if (this.props.handValue) {
      if (!this.props.isNPC || (this.props.isNPC && this.props.isDealerHandVisible)) {
        handValueString = `Hand Value: ${this.props.handValue.aceAsOne} `;
        if (this.props.handValue.aceAsOne !== this.props.handValue.aceAsEleven) {
          handValueString += " / " + this.props.handValue.aceAsEleven;
        }
      }
    }

    return (
      <div className="DeckContainer">
        {!this.props.isPlayerDeck && (
          <span
            data-title={deckTitleString}
            className="ms-font-m"
            onClick={this._toggleDeck}
          >
            {toggleIcon}
          </span>
        )}
        {this.props.isPlayerDeck &&
          this.props.isHandValueVisible && (
            <span data-title={handValueString} className="ms-font-l" />
          )}
        {this.state.isDeckVisible && (
          <Masonry
            className={"deck"}
            elementType={"div"}
            disableImagesLoaded={false}
            updateOnEachImageLoad={false} // default false and works only if disableImagesLoaded is false
            options={masonryOptions}
          >
            {cardElements}
          </Masonry>
        )}
      </div>
    );
  }
}

export default DeckContainer;
