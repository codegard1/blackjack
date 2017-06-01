import React, { Component } from "react";
import Masonry from "react-masonry-component";
import CardContainer from "./CardContainer";

export class DeckContainer extends Component {
  render() {
    const masonryOptions = {
      transitionDuration: "0.5s"
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

    return (
      <div id="DeckContainer">
        <h3>{this.props.title}</h3>
        <Masonry
          className={"deck"} // default ''
          elementType={"div"}
          options={masonryOptions} // default {}
          disableImagesLoaded={false} // default false
          updateOnEachImageLoad={false} // default false and works only if disableImagesLoaded is false
        >
          {childElements}
        </Masonry>

      </div>
    );
  }
}

export default DeckContainer;
