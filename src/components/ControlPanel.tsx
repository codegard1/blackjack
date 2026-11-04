// React
import React from "react";

import {
  Button,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Tooltip,
} from '@fluentui/react-components';
import {
  Add20Regular,
  ArrowClockwise20Regular,
  ArrowDown20Regular,
  ArrowForward20Regular,
  ArrowUp20Regular,
  ArrowUpload20Regular,
} from '@fluentui/react-icons';

// Local Resources
import { useGameContext, useSettingContext } from "../context";
import { GameAction, GameStatus } from "../enums";
import { canDoubleDown } from "../functions/gameReducer";
import { IControlPanelProps } from "../interfaces";

// Component
export const ControlPanel: React.FC<IControlPanelProps> = (props) => {

  // Props
  const { playerKey, hidden } = props;

  // State from context
  const { gameState, gameDispatch } = useGameContext();
  const { toggleSetting } = useSettingContext();
  const { gameStatus, minimumBet } = gameState;
  const playerStore = gameState.playerStore.state;

  // Computed properties
  const currentPlayerKey = playerStore.currentPlayerKey;
  const player = playerStore.players[props.playerKey];
  const npcFlag = player.isNPC;
  const isRoundComplete = gameStatus >= GameStatus.HumanWins;
  const isBtnDisabled = isRoundComplete || currentPlayerKey !== playerKey;
  const isDealDisabled = !isRoundComplete && currentPlayerKey !== playerKey;
  const isDoubleDownDisabled = !canDoubleDown(gameState, playerKey);

  const _hit = () => {
    toggleSetting({ key: 'isMessageBarVisible', value: true });
    gameDispatch({ type: GameAction.Draw, playerKey, numberOfCards: 1, deckSide: 'top' });
  }

  const draw = (deckSide: 'top' | 'bottom' | 'random') => {
    gameDispatch({ type: GameAction.Draw, playerKey, deckSide, numberOfCards: 1 });
  };

  const deal = () => {
    gameDispatch({ type: GameAction.Deal });
    toggleSetting({ key: 'isMessageBarVisible', value: true });
    gameDispatch({
      type: GameAction.ShowMessageBar,
      messageBarDefinition: { text: 'New Round', type: 'info', isMultiLine: false },
    });
  };

  return hidden ? null : (
    <div className="player-controlpanel" style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      <Tooltip content="Draw one card from the top of the deck" relationship="label">
        <Button appearance="subtle" icon={<Add20Regular />} disabled={isBtnDisabled} onClick={_hit}>Hit</Button>
      </Tooltip>
      <Button appearance="subtle" icon={<ArrowUp20Regular />} disabled={isBtnDisabled} onClick={() => gameDispatch({ type: GameAction.Bet, playerKey, betAmount: minimumBet })}>
        Wager ${minimumBet}
      </Button>
      <Button appearance="subtle" icon={<ArrowForward20Regular />} disabled={isBtnDisabled} onClick={() => gameDispatch({ type: GameAction.Stay, playerKey })}>
        Stay
      </Button>
      {!npcFlag && (
        <Tooltip content="Double your stake, take exactly one more card, then stand" relationship="description">
          <Button appearance="subtle" icon={<ArrowUpload20Regular />} disabled={isDoubleDownDisabled} onClick={() => gameDispatch({ type: GameAction.DoubleDown, playerKey })}>
            Double Down
          </Button>
        </Tooltip>
      )}
      {!npcFlag && (
        <Button appearance="subtle" icon={<ArrowClockwise20Regular />} disabled={isDealDisabled} onClick={deal}>
          Deal
        </Button>
      )}
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Button appearance="subtle" icon={<ArrowDown20Regular />} disabled={isBtnDisabled}>Draw</Button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem onClick={() => draw('top')}>Draw from Top</MenuItem>
            <MenuItem onClick={() => draw('bottom')}>Draw from Bottom of Deck</MenuItem>
            <MenuItem onClick={() => draw('random')}>Draw Random</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>
    </div>
  );
}
