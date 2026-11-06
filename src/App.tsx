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
import { collectStats, gameReducer, isHuman, isRoundOver, loadGameState, loadProfiles, loadSettings, profileReducer, roundResultText, saveGameState, saveProfiles, saveSettings, settingReducer } from './functions';
import { MessageBarDefinition, MessageIntent } from './types';

// Main Component
const App = () => {

  // State from context
  const [gameState, gameDispatch] = React.useReducer(gameReducer, undefined, loadGameState);
  const [settings, toggleSetting] = React.useReducer(settingReducer, undefined, loadSettings);
  const [profiles, profileDispatch] = React.useReducer(profileReducer, undefined, loadProfiles);
  const players = gameState.playerStore.all;
  const human = players.find(isHuman);
  // once the round is settled, each seat's result in seating order, the dealer last
  const isSettled = gameState.gameStatusFlag && isRoundOver(gameState.gameStatus);
  const resultText = isSettled ? roundResultText(players)
    : gameState.gameStatus === GameStatus.GameOver ? 'Game over.' : '';
  const resultKey = `result:${gameState.round}:${gameState.gameStatus}`;
  const resultIntent: MessageIntent = human?.result === 'win' || human?.result === 'blackjack'
    ? 'success'
    : human?.result === 'push' ? 'info' : 'warning';
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

  // Evaluate game whenever the status changes, or a new round reaches the same
  // status (a natural can end a round in the same action that starts it).
  // Start from the loaded status so a restored round that already ended is not
  // paid out a second time; settlement is also guarded by gameStatusFlag.
  const statusKey = `${gameState.round}:${gameState.gameStatus}`;
  const lastEvaluatedStatus = React.useRef(statusKey);
  React.useEffect(() => {
    if (lastEvaluatedStatus.current === statusKey) return;
    lastEvaluatedStatus.current = statusKey;
    gameDispatch({ type: GameAction.EvaluateGame, gameStatus: gameState.gameStatus });
  }, [statusKey, gameState.gameStatus])

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
