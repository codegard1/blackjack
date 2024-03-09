// React
import React from 'react';

// FluentUI
import { Stack, Text, Link, FontWeights, IStackTokens, IStackStyles, ITextStyles } from '@fluentui/react';

// Local Resources
import './App.css';
import { CardContainer } from './components';
import { PlayingCardDeck } from './classes';


const boldStyle: Partial<ITextStyles> = { root: { fontWeight: FontWeights.semibold } };
const stackTokens: IStackTokens = { childrenGap: 15 };
const stackStyles: Partial<IStackStyles> = {
  root: {
    width: '960px',
    margin: '0 auto',
    textAlign: 'center',
    color: '#605e5c',
  },
};

// Main Component
const App = () => {

  // State
  const [deck, setDeck] = React.useState<PlayingCardDeck>(new PlayingCardDeck());

  const cardsTest = deck.cards.map((c, i, a) =>
    <CardContainer {...c}
      key={`card_${i}`}
      isSelectable
      isDescVisible
    />
  );

  return (
    <Stack tokens={stackTokens} styles={stackStyles} horizontal wrap horizontalAlign='space-between' verticalAlign='space-evenly' verticalFill>
      {cardsTest}
    </Stack>
  );
}

export default App;
