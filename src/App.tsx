// React
import * as React from 'react';

// FluentUI
import { Stack } from '@fluentui/react';

// Local Resources
import './App.css';
import { CardContainer } from './components';
import { PlayingCardDeck } from './classes';

// Main Component
const App = () => {

  // State
  const [deck, setDeck] = React.useState<PlayingCardDeck>(new PlayingCardDeck());

  const cardsTest = deck.cards.map((c, i, a) => <CardContainer {...c} key={`card_${i}`} />);

  return (
    <Stack horizontal wrap horizontalAlign='space-between' verticalAlign='space-evenly' verticalFill>
      {cardsTest}
    </Stack>
  );
}

export default App;
