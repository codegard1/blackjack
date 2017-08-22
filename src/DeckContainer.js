import React from "react";
import * as T from "prop-types";
import Masonry from "react-masonry-component";

/* custom stuff */
import { BaseComponent } from "./BaseComponent";
import "./DeckContainer.css";
import { CardContainer } from "./CardContainer";

/* flux */
import { AppActions } from "./actions/AppActions";

export class DeckContainer extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      isDeckVisible: true
    };

    /* bind private methods */
    this._bind("_toggleDeck");
  }

  componentWillMount() {
    if (this.props.hidden === true) {
      this.setState({ isDeckVisible: false });
    }
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

    let style =
      this.props.player && this.props.player.turn
        ? "DeckContainer selected "
        : "DeckContainer ";

    if (
      this.props.player &&
      this.props.player.status === "staying" &&
      !this.props.player.turn
    ) {
      style += "staying ";
    }

    return (
      <div className={style}>
        {!this.props.player && toggleIcon}{" "}
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
  deck: T.array.isRequired, // DeckStore
  handValue: T.object, // DeckStore
  gameStatus: T.number, // GameStore
  player: T.object, // GameStore
  turnCount: T.number, // GameStore
  isSelectable: T.bool.isRequired, // props
  hidden: T.bool.isRequired, // props
  title: T.string.isRequired // props
};

export default DeckContainer;
