// React
import React from 'react';

// FluentUI
import { Button, FluentProvider, MessageBar, MessageBarActions, MessageBarBody, webLightTheme } from '@fluentui/react-components';
import { Dismiss20Regular } from '@fluentui/react-icons';

// Local Resources
import './App.css';
import { ActivityLog, AppHeader, OptionsPanel, Table, DebugWindow } from './components';
import { GameContext, GameDispatchContext, ProfileContext, ProfileDispatchContext, SettingContext, SettingDispatchContext } from './context';
import { GameAction, GameStatus } from './enums';
import { collectStats, gameReducer, loadGameState, loadProfiles, loadSettings, profileReducer, saveGameState, saveProfiles, saveSettings, settingReducer } from './functions';
import { MessageBarDefinition, MessageIntent } from './types';

// Main Component
const App = () => {

  // State from context
  const [gameState, gameDispatch] = React.useReducer(gameReducer, undefined, loadGameState);
  const [settings, toggleSetting] = React.useReducer(settingReducer, undefined, loadSettings);
  const [profiles, profileDispatch] = React.useReducer(profileReducer, undefined, loadProfiles);
  const human = gameState.playerStore.all.find((player) => !player.isNPC);
  const dealer = gameState.playerStore.all.find((player) => player.isNPC);
  const roundWinner = gameState.gameStatus === GameStatus.HumanWins ? human
    : gameState.gameStatus === GameStatus.DealerWins ? dealer : undefined;
  const roundLoser = gameState.gameStatus === GameStatus.HumanWins ? dealer : human;
  const roundResults = gameState.activityLog.filter((entry) =>
    entry.round === gameState.round && (
      entry.event === 'win'
      || entry.event === 'push'
      || (entry.event === 'loss' && entry.description === 'lost the round')
    ),
  );
  const resultText = gameState.gameStatus === GameStatus.HumanWins
    || gameState.gameStatus === GameStatus.DealerWins
    || gameState.gameStatus === GameStatus.Push
    ? roundResults.length > 0
      ? roundResults.map((entry) => `${entry.name}: ${entry.description}`).join('. ') + '.'
      : gameState.gameStatus === GameStatus.Push
        ? human && dealer ? `${human.title}: stake returned. ${dealer.title}: stake returned.` : ''
        : roundWinner && roundLoser
          ? `${roundWinner.title}: ${roundWinner.isBlackjack ? 'won the pot with blackjack' : 'won the pot'}. ${roundLoser.title}: lost the round.`
          : ''
    : gameState.gameStatus === GameStatus.GameOver ? 'Game over.' : '';
  const resultKey = `result:${gameState.round}:${gameState.gameStatus}:${roundResults.map((entry) => entry.id).join(',')}`;
  const resultIntent: MessageIntent = gameState.gameStatus === GameStatus.HumanWins
    ? 'success'
    : gameState.gameStatus === GameStatus.Push ? 'info' : 'warning';
  const roundStartedEntry = gameState.activityLog.find((entry) =>
    entry.round === gameState.round && entry.event === 'round',
  );
  const messageDefinition = settings.isMessageBarVisible && gameState.messageBarDefinition.text
    ? gameState.messageBarDefinition
    : undefined;
  const activeMessage = resultText
    ? { key: resultKey, text: resultText, type: resultIntent }
    : messageDefinition
      ? {
        key: messageDefinition,
        text: messageDefinition.text === 'New Round' ? roundStartedEntry?.description ?? messageDefinition.text : messageDefinition.text,
        type: messageDefinition.type,
      }
      : undefined;
  const [visibleMessageKey, setVisibleMessageKey] = React.useState<string | MessageBarDefinition>();
  const activeMessageKey = activeMessage?.key;

  React.useEffect(() => {
    if (!activeMessageKey) {
      setVisibleMessageKey(undefined);
      return;
    }

    setVisibleMessageKey(activeMessageKey);
    const timeoutId = window.setTimeout(() => setVisibleMessageKey(undefined), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [activeMessageKey]);

  // Persist game, settings and player profiles so a reload resumes where the player left off
  React.useEffect(() => saveSettings(settings), [settings]);
  React.useEffect(() => saveGameState(gameState), [gameState]);
  React.useEffect(() => saveProfiles(profiles), [profiles]);

  // Evaluate game whenever the status changes. Start from the loaded status
  // so a restored round that already ended is not paid out a second time.
  const lastEvaluatedStatus = React.useRef(gameState.gameStatus);
  React.useEffect(() => {
    if (lastEvaluatedStatus.current === gameState.gameStatus) return;
    lastEvaluatedStatus.current = gameState.gameStatus;
    gameDispatch({ type: GameAction.EvaluateGame, gameStatus: gameState.gameStatus });
  }, [gameState.gameStatus])

  // When a round settles, carry each player's updated stats back to their profile.
  // Only the transition counts, so a restored settled round is not added twice.
  const wasSettled = React.useRef(gameState.gameStatusFlag);
  React.useEffect(() => {
    const wasSettledBefore = wasSettled.current;
    wasSettled.current = gameState.gameStatusFlag;
    if (!wasSettledBefore && gameState.gameStatusFlag) {
      profileDispatch({ type: 'syncStats', stats: collectStats(gameState.playerStore.all) });
    }
  }, [gameState]);

  return (
    <FluentProvider theme={webLightTheme}>
      <SettingContext.Provider value={settings}>
        <SettingDispatchContext.Provider value={toggleSetting}>
          <ProfileContext.Provider value={profiles}>
            <ProfileDispatchContext.Provider value={profileDispatch}>
              <GameContext.Provider value={gameState}>
                <GameDispatchContext.Provider value={gameDispatch}>

                  <AppHeader />

                  {activeMessage && visibleMessageKey === activeMessage.key && (
                    <MessageBar intent={activeMessage.type}>
                      <MessageBarBody>{activeMessage.text}</MessageBarBody>
                      <MessageBarActions
                        containerAction={
                          <Button
                            appearance="transparent"
                            aria-label="Dismiss message"
                            icon={<Dismiss20Regular />}
                            onClick={() => setVisibleMessageKey(undefined)}
                          />
                        }
                      />
                    </MessageBar>
                  )}

                  <OptionsPanel />
                  <div className="app-content">
                    <Table />
                    <ActivityLog />
                    <DebugWindow />
                  </div>

                </GameDispatchContext.Provider>
              </GameContext.Provider>
            </ProfileDispatchContext.Provider>
          </ProfileContext.Provider>
        </SettingDispatchContext.Provider>
      </SettingContext.Provider>
    </FluentProvider>
  );
}

export default App;
