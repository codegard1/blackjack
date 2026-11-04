// React
import React from "react";

import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  Spinner,
  Text,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import { Bot20Regular } from '@fluentui/react-icons';

/* custom stuff */
import { CardStack, ControlPanel, DeckCallout, StatusDisplay } from '.';
import { IPlayerContainerProps } from "../interfaces";
import { GameStatus } from "../enums";
import { isRoundOver, isSeatWinner, seatStatus } from "../functions/seatStatus";

// Styles
import "./PlayerContainer.css";

// Context
import { useGameContext } from "../context";

const sparkleKeyframes = {
  '0%': { opacity: 0, transform: 'translate(-50%, -50%) scale(0.2) rotate(0deg)' },
  '35%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1) rotate(45deg)' },
  '100%': { opacity: 0, transform: 'translate(-50%, -50%) scale(0.4) rotate(90deg)' },
};

const useStyles = makeStyles({
  seat: {
    position: 'relative',
    width: '100%',
    overflow: 'visible',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow4,
    outline: `${tokens.strokeWidthThick} solid transparent`,
    outlineOffset: '2px',
    transitionProperty: 'box-shadow, outline-color, transform, background-color',
    transitionDuration: tokens.durationGentle,
    transitionTimingFunction: tokens.curveEasyEase,
    containerType: 'inline-size',
    containerName: 'seat',
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0.01ms' },
  },
  active: {
    boxShadow: tokens.shadow16,
    outlineColor: tokens.colorBrandStroke1,
    transform: 'translateY(-2px)',
  },
  staying: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  winner: {
    boxShadow: `0 0 0 ${tokens.strokeWidthThick} ${tokens.colorPaletteGreenBorder2}, ${tokens.shadow16}`,
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalXXS,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalM,
  },
  sparkles: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
    borderRadius: tokens.borderRadiusXLarge,
  },
  sparkle: {
    position: 'absolute',
    color: tokens.colorPaletteMarigoldBorderActive,
    fontSize: '26px',
    textShadow: `0 0 8px ${tokens.colorPaletteYellowBackground3}`,
    animationName: sparkleKeyframes,
    animationDuration: '1600ms',
    animationTimingFunction: tokens.curveDecelerateMid,
    animationIterationCount: 3,
    animationFillMode: 'both',
    '@media (prefers-reduced-motion: reduce)': { display: 'none' },
  },
});

/* Sparkle positions (percent of the seat) and stagger delays */
const SPARKLES = [
  { left: '8%', top: '20%', delay: 0 },
  { left: '92%', top: '18%', delay: 160 },
  { left: '18%', top: '82%', delay: 320 },
  { left: '80%', top: '78%', delay: 480 },
  { left: '50%', top: '10%', delay: 240 },
  { left: '64%', top: '52%', delay: 600 },
  { left: '34%', top: '48%', delay: 760 },
  { left: '96%', top: '58%', delay: 880 },
];

/**
 * The expanded seat: name, bank, status, cards, and (for the human) the action toolbar
 */
export const PlayerContainer: React.FC<IPlayerContainerProps> = (props) => {

  // Props
  const { playerKey } = props;
  const styles = useStyles();

  // Context
  const { gameState } = useGameContext();

  // computed values
  const playerState = gameState.playerStore.state;
  const player = playerState.players[playerKey];
  const playerStatusFlag = (player.isBusted ||
    player.isFinished ||
    player.isStaying ||
    !player.turn);
  const deckState = gameState.deck.state;
  const playerHand = deckState.playerHands[playerKey] ?? {
    cards: [],
    handValue: { aceAsEleven: 0, aceAsOne: 0, highest: 0 },
  };
  const { cards, handValue } = playerHand;

  const { gameStatus } = gameState;
  const isWinner = isSeatWinner(player, gameStatus);
  const isActive = !!player.turn && !isRoundOver(gameStatus);

  const id = `DeckCalloutTarget-${player.title}`;

  // State
  const [isDeckCalloutVisible, setDeckCalloutVisible] = React.useState<boolean>(false);

  // shorthand methods to show and hide the deck callout
  const _showDeckCallout = () => setDeckCalloutVisible(true);
  const _hideDeckCallout = () => setDeckCalloutVisible(false);

  /* selectedFlag is true if getSelected() returns an array */
  const selectedFlag = false;

  // Status badge (one at a time, most important first)
  const status = seatStatus(player, gameStatus);

  const seatClass = mergeClasses(
    'PlayerContainer',
    styles.seat,
    isActive && styles.active,
    player.isStaying && !isActive && styles.staying,
    isWinner && styles.winner,
  );

  return (
    <Card className={seatClass} size="large" aria-label={`${player.title}'s seat`}>
      {isWinner && (
        <div className={styles.sparkles} aria-hidden="true">
          {SPARKLES.map((s, i) => (
            <span key={i} className={styles.sparkle} style={{ left: s.left, top: s.top, animationDelay: `${s.delay}ms` }}>✦</span>
          ))}
        </div>
      )}

      <CardHeader
        image={player.isNPC
          ? <Avatar icon={<Bot20Regular />} color="steel" aria-hidden="true" />
          : <Avatar name={player.title} color="brand" aria-hidden="true" />}
        header={
          <div className={styles.title}>
            <Text size={500} weight="semibold">{`${player.title} ($${player.bank || 0})`}</Text>
            {status && <Badge appearance={status.appearance} color={status.color}>{status.text}</Badge>}
          </div>
        }
        action={<StatusDisplay player={player} stats={player.stats} />}
      />

      <div className={styles.body}>
        <div id={id} className="player-hand">
          <CardStack
            cards={cards}
            hidden={cards.length === 0}
            isSelectable
            player={player}
            title={player.title}
          />
        </div>

        {player.isNPC && gameState.dealerHasControl &&
          <div className="player-agent">
            <Spinner size="large" label="Thinking" aria-live="assertive" />
          </div>
        }

        <ControlPanel
          hidden={player.isNPC}
          playerKey={props.playerKey}
          playerStatusFlag={playerStatusFlag}
          selectedFlag={selectedFlag}
          showDeckCallout={_showDeckCallout}
          isDeckCalloutVisible={isDeckCalloutVisible}
        />
      </div>
      <DeckCallout player={player} hidden={!isDeckCalloutVisible} onHideCallout={_hideDeckCallout} target={'#' + id} />
    </Card>
  );
}
