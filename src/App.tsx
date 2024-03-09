// React
import React from 'react';

// FluentUI
import { Stack, Text, Link, FontWeights, IStackTokens, IStackStyles, ITextStyles } from '@fluentui/react';

// Local Resources
import './App.css';
import { DeckContainer } from './components';
import { PlayingCardDeck, } from './classes';
import AppContext from './classes/AppContext';

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
  const [isCardDescVisible, setCardDescVisible] = React.useState<boolean>(false);
  const [isDealerHandVisible, setDealerHandVisible] = React.useState<boolean>(false);
  const [isHandValueVisible, setHandValueVisible] = React.useState<boolean>(false);
  const [gameStatus, setGameStatus] = React.useState<number>(0);

  return (
    <AppContext.Provider value={{
      deck,
      isCardDescVisible,
      isDealerHandVisible,
      isHandValueVisible,
      gameStatus,
    }}>
      <Stack tokens={stackTokens} styles={stackStyles} horizontal wrap horizontalAlign='space-between' verticalAlign='space-evenly' verticalFill>
        <DeckContainer
          hidden={false}
          handValue={''}
          isNPC={false}
          isPlayerDeck={false}
          isSelectable
          player={''}
          title={'Deck 1'}
          turnCount={0}
        />
      </Stack>
    </AppContext.Provider>
  );
}

export default App;
