// React
import React from "react";

import {
  Button,
  ColorSwatch,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  Divider,
  Dropdown,
  Field,
  Link,
  Option,
  Radio,
  RadioGroup,
  SwatchPicker,
  Switch,
  Text,
  Tooltip,
} from '@fluentui/react-components';
import {
  ArrowClockwise20Regular,
  ArrowReset20Regular,
  ArrowSync20Regular,
  Delete20Regular,
  Dismiss20Regular,
  Stack20Regular,
} from '@fluentui/react-icons';

// Context
import { CardBackPreview } from "./CardBackPreview";
import { useGameContext, useProfileContext, useSettingContext } from "../context";
import { GameAction } from "../enums";
import { clearStores, seatsFor } from "../functions";
import { brandPresets, cardBackColorList, cardBackPatternList, cardStyleList, cardStylePresets, themeModeList } from "../theme";
import { AccentKey, CardBackColor, CardBackPattern, CardStyle, ThemeMode, accentKeys, appearanceSettingKeys } from "../types";

export const OptionsPanel: React.FC = () => {

  // Context
  const { settings, toggleSetting } = useSettingContext();
  const { gameState, gameDispatch } = useGameContext();
  const { profiles, profileDispatch } = useProfileContext();
  const playerStore = gameState.playerStore;

  const closeOptionsPanel = () => {
    toggleSetting({ key: "isOptionsPanelVisible", value: false });
  }

  /**
   * Reset the game from the Options Panel
   */
  const resetGame = () => {
    gameDispatch({ type: GameAction.ResetGame });
    gameDispatch({ type: GameAction.ShowMessageBar, messageBarDefinition: { text: 'Game Reset', type: 'info', isMultiLine: false } });
    closeOptionsPanel();
  }

  const clearApplicationData = () => {
    clearStores();
    gameDispatch({ type: GameAction.ResetGame, clearActivityLog: true });
    profileDispatch({ type: 'reset' });
    toggleSetting({ key: 'reset' });
  }

  const newDeal = () => {
    // between hands, a roster change made during play takes effect first
    gameDispatch({ type: GameAction.SetRoster, players: seatsFor(profiles) });
    gameDispatch({ type: GameAction.Deal });
    closeOptionsPanel();
  }

  const shuffle = () => {
    gameDispatch({ type: GameAction.Shuffle });
    closeOptionsPanel();
  }

  /** Put the theme, card style and card back settings back to their defaults */
  const resetAppearance = () => toggleSetting({ key: 'reset', keys: appearanceSettingKeys });

  return (
    <Drawer
      open={settings.isOptionsPanelVisible}
      onOpenChange={(_, data) => {
        if (!data.open) closeOptionsPanel();
      }}
      position="end"
      size="medium"
      modalType="modal"
    >
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close options"
              icon={<Dismiss20Regular />}
              onClick={closeOptionsPanel}
            />
          }
        >
          Options
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        <div className="options-panel-actions">
          <Tooltip content="Start a new round with the selected players" relationship="label">
            <Button icon={<Stack20Regular />} onClick={newDeal}>Deal</Button>
          </Tooltip>
          <Tooltip content="Reset the game with initial parameters" relationship="label">
            <Button icon={<ArrowClockwise20Regular />} onClick={resetGame}>Reset Game</Button>
          </Tooltip>
          <Tooltip content="Shuffle the remaining deck" relationship="label">
            <Button icon={<ArrowSync20Regular />} onClick={shuffle}>Shuffle Deck</Button>
          </Tooltip>
          <Tooltip content="Clear application data stored locally in the browser" relationship="label">
            <Button icon={<Delete20Regular />} onClick={clearApplicationData}>Clear Stores</Button>
          </Tooltip>
        </div>

        <Divider />

        <div className="options-panel-switches">
          <Switch checked={settings.isDeckVisible} label="Show Deck" onChange={(_, data) => toggleSetting({ key: 'isDeckVisible', value: data.checked })} />
          <Switch checked={settings.isDrawnVisible} label="Show Drawn" onChange={(_, data) => toggleSetting({ key: 'isDrawnVisible', value: data.checked })} />
          <Switch checked={settings.isSelectedVisible} label="Show Selected" onChange={(_, data) => toggleSetting({ key: 'isSelectedVisible', value: data.checked })} />
          <Switch checked={settings.isDealerHandVisible} label="Show Dealer Hand" onChange={(_, data) => toggleSetting({ key: 'isDealerHandVisible', value: data.checked })} />
          <Switch checked={settings.isHandValueVisible} label="Show Hand Value" onChange={(_, data) => toggleSetting({ key: 'isHandValueVisible', value: data.checked })} />
          <Switch checked={settings.isActivityLogVisible} label="Open Activity Log by default" onChange={(_, data) => toggleSetting({ key: 'isActivityLogVisible', value: data.checked })} />
          <Switch checked={settings.isDebugWindowVisible} label="Show Debug Window" onChange={(_, data) => toggleSetting({ key: 'isDebugWindowVisible', value: data.checked })} />
        </div>

        <Divider />

        <section className="options-panel-appearance" aria-labelledby="options-appearance-heading">
          <Text as="h3" id="options-appearance-heading" weight="semibold" size={400}>Appearance</Text>

          <Field label="Theme">
            <RadioGroup
              layout="horizontal"
              value={settings.themeMode}
              onChange={(_, data) => toggleSetting({ key: 'themeMode', value: data.value as ThemeMode })}
            >
              {themeModeList.map((mode) => <Radio key={mode.key} value={mode.key} label={mode.label} />)}
            </RadioGroup>
          </Field>

          <Field label="Accent color">
            <SwatchPicker
              aria-label="Accent color"
              shape="circular"
              size="small"
              selectedValue={settings.accent}
              onSelectionChange={(_, data) => toggleSetting({ key: 'accent', value: data.selectedValue as AccentKey })}
            >
              {accentKeys.map((key) => (
                <Tooltip key={key} content={brandPresets[key].label} relationship="label">
                  <ColorSwatch value={key} color={brandPresets[key].ramp[80]} />
                </Tooltip>
              ))}
            </SwatchPicker>
          </Field>

          <Field label="Card style" hint={cardStylePresets[settings.cardStyle].description}>
            <Dropdown
              aria-label="Card style"
              value={cardStylePresets[settings.cardStyle].label}
              selectedOptions={[settings.cardStyle]}
              onOptionSelect={(_, data) => {
                if (data.optionValue) toggleSetting({ key: 'cardStyle', value: data.optionValue as CardStyle });
              }}
            >
              {cardStyleList.map((style) => <Option key={style.key} value={style.key} text={style.label}>{style.label}</Option>)}
            </Dropdown>
          </Field>

          <div className="options-panel-card-back">
            <CardBackPreview height={112} />
            <div className="options-panel-card-back-fields">
              <Field label="Card back pattern">
                <RadioGroup
                  layout="horizontal"
                  value={settings.cardBackPattern}
                  onChange={(_, data) => toggleSetting({ key: 'cardBackPattern', value: data.value as CardBackPattern })}
                >
                  {cardBackPatternList.map((pattern) => <Radio key={pattern.key} value={pattern.key} label={pattern.label} />)}
                </RadioGroup>
              </Field>
              <Field label="Card back color">
                <SwatchPicker
                  aria-label="Card back color"
                  shape="rounded"
                  size="small"
                  selectedValue={settings.cardBackColor}
                  onSelectionChange={(_, data) => toggleSetting({ key: 'cardBackColor', value: data.selectedValue as CardBackColor })}
                >
                  {cardBackColorList.map((color) => (
                    <Tooltip key={color.key} content={color.label} relationship="label">
                      <ColorSwatch value={color.key} color={`var(--${color.primary})`} />
                    </Tooltip>
                  ))}
                </SwatchPicker>
              </Field>
            </div>
          </div>

          <div>
            <Tooltip content="Return the theme, card style and card back to their defaults" relationship="description">
              <Button icon={<ArrowReset20Regular />} onClick={resetAppearance}>Reset appearance</Button>
            </Tooltip>
          </div>
        </section>

        <Divider />

        <Text weight="semibold">Chris's Blackjack</Text>
        <Text size={200}>
          &copy;2026 <Link href="https://github.com/codegard1/blackjack">Chris Odegard</Link>
          <br />
          Made in Brooklyn with <Link href="https://react.dev/">React</Link> and <Link href="https://developer.microsoft.com/en-us/fluentui">Fluent UI</Link>.
        </Text>
      </DrawerBody>
    </Drawer>
  );
}
