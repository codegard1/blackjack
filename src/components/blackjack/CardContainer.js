import React from "react";
import * as T from "prop-types";

import BaseComponent from "../BaseComponent";

/* fluent ui */
import {
  DefaultPalette,
  mergeStyles,
  Stack,
  Text,
} from "@fluentui/react";
import {
  MotionAnimations,
} from '@fluentui/theme';


// Fluent UI styles
const cardStyles = {
  root: {
    animation: MotionAnimations.slideUpIn,
    height: 100,
    overflow: "hidden",
    width: 65,
    borderRadius: "5px",
    padding: "2px"
  },
  cardTitleTop: {
    // border: "1px solid orange",
  },
  cardTitleBottom: {
    // border: "1px solid green",
  },
  cardDescription: {
    textAlign: "center",
    fontWeight: "light",
  },
  hearts: { color: DefaultPalette.red },
  diamonds: { color: DefaultPalette.red },
  spades: { color: DefaultPalette.neutralDark },
  clubs: { color: DefaultPalette.neutralDark },
  selectable: { cursor: "pointer" },
  unselectable: { cursor: "default" },
  unselected: {
    boxShadow: "2px 2px 2px rgba(25, 25, 25, 0.2)",
    border: "1px solid #ddd",
  },
  selected: {
    border: "1px solid" + DefaultPalette.blue,
    boxShadow: "4px 4px 10px rgba(25, 25, 25, 0.2)",
  },
  frontFacing: {
    backgroundColor: DefaultPalette.neutralLighterAlt,
  },
  backFacing: {
    backgroundColor: DefaultPalette.blueLight,
    backgroundImage: "radial-gradient(closest-side, transparent 98%, rgba(10, 10, 90, .3) 99%), radial-gradient(closest-side, transparent 98%, rgba(10, 10, 90, .3) 99%)",
    backgroundSize: "80px 80px",
    backgroundPosition: "0 0, 40px 40px",
  }
};

class CardContainer extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = { isSelected: false };

    /* bind private methods */
    this._bind("_toggleSelect");
  }

  static propTypes = {
    description: T.string.isRequired,
    deselect: T.func,
    isBackFacing: T.bool,
    isSelectable: T.bool,
    isDescVisible: T.bool,
    select: T.func,
    sort: T.number.isRequired,
    suit: T.string.isRequired
  };

  _toggleSelect() {
    const cardAttributes = {
      description: this.props.description,
      suit: this.props.suit,
      sort: this.props.sort
    };
    if (this.state.isSelected === false) {
      this.props.select(cardAttributes);
      this.setState({ isSelected: true });
    }
    if (this.state.isSelected === true) {
      this.props.deselect(cardAttributes);
      this.setState({ isSelected: false });
    }
  }

  render() {
    const description = this.props.description + " of " + this.props.suit + "s";

    let cardTitle;
    switch (this.props.sort) {
      case 14:
        cardTitle = "A";
        break;

      case 13:
        cardTitle = "K";
        break;

      case 12:
        cardTitle = "Q";
        break;

      case 11:
        cardTitle = "J";
        break;

      default:
        cardTitle = this.props.sort;
        break;
    }

    let cardIcon, cardTitleClass;
    switch (this.props.suit) {
      case "Heart":
        cardIcon = "\u2665";
        cardTitleClass = cardStyles.hearts;
        break;

      case "Spade":
        cardIcon = "\u2660";
        cardTitleClass = cardStyles.spades;
        break;

      case "Diamond":
        cardIcon = "\u2666";
        cardTitleClass = cardStyles.diamonds;
        break;

      case "Club":
        cardIcon = "\u2663";
        cardTitleClass = cardStyles.clubs;
        break;

      default:
        break;
    }

    let cardClass = this.props.isBackFacing ? [cardStyles.root, cardStyles.backFacing] : [cardStyles.root, cardStyles.frontFacing];
    cardClass.push(this.props.isSelectable ? cardStyles.selectable : cardStyles.unselectable);
    cardClass.push(this.state.isSelected ? cardStyles.selected : cardStyles.unselected);


    return (
      <Stack
        verticalAlign="space-between"
        className={mergeStyles(cardClass)}
        onClick={this.props.isSelectable ? this._toggleSelect : undefined}
      >
        {!this.props.isBackFacing &&
          <Stack.Item align="start">
            <Text variant="large" block nowrap className={mergeStyles(cardTitleClass, cardStyles.cardTitleTop)}>
              {cardTitle}{cardIcon}
            </Text>
          </Stack.Item>
        }

        {!this.props.isBackFacing && this.props.isDescVisible &&
          <Stack.Item>
            <Text variant="small" block wrap className={cardStyles.cardDescription}>
              {description}
            </Text>
          </Stack.Item>
        }

        {!this.props.isBackFacing &&
          <Stack.Item align="end">
            <Text variant="large" block nowrap className={mergeStyles(cardTitleClass, cardStyles.cardTitleTop)}>
              {cardTitle}{cardIcon}
            </Text>
          </Stack.Item>
        }
      </Stack>
    );
  }
}

export default CardContainer;
