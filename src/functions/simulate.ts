import { BOTS, CHARACTERS, DEALER } from "../characters";
import { createGameState } from "../context/GameContext";
import { STARTING_BANK } from "../definitions";
import { GameAction, GameStatus } from "../enums";
import { IPlayerOptions } from "../interfaces";
import { GameState, PlayerStats } from "../types";
import { gameReducer } from "./gameReducer";
import { emptyStats } from "./profiles";
import { decideSeatMove, isBot } from "./round";

/** A seeded random number generator (mulberry32): the same seed gives the same history */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SimulationOptions = {
  /** rounds to play in all */
  rounds: number;
  /** random number source; Math.random by default */
  rng?: () => number;
  /** shortest and longest sitting, in rounds; a sitting also ends when every computer player is broke */
  sessionLength?: [number, number];
  /** called every so often with the rounds played so far */
  onProgress?: (roundsPlayed: number) => void;
};

export type SimulationResult = {
  rounds: number;
  sessions: number;
  /** each character's stats from the simulated rounds alone, keyed by character id */
  stats: Record<string, PlayerStats>;
  /** each character's total bank change, keyed by character id; they sum to zero */
  net: Record<string, number>;
};

/** Guards against a round that never ends; a real round takes a handful of moves per seat */
const MAX_MOVES_PER_ROUND = 200;

const pick = <T,>(items: T[], rng: () => number): T => items[Math.floor(rng() * items.length)];

/** A random line-up of one to four computer players, in seating order */
function chooseLineup(rng: () => number): typeof BOTS {
  const count = 1 + Math.floor(rng() * BOTS.length);
  const chosen = new Set<string>();
  while (chosen.size < count) chosen.add(pick(BOTS, rng).id);
  return BOTS.filter((bot) => chosen.has(bot.id));
}

/** Seats for a sitting: the chosen computer players, then the dealer, each with a fresh bank */
function seatsFor(lineup: typeof BOTS, stats: Record<string, PlayerStats>): IPlayerOptions[] {
  return [
    ...lineup.map((bot, index): IPlayerOptions => ({
      key: bot.id, title: bot.name, isNPC: true, role: 'bot', id: index + 1, bank: STARTING_BANK, stats: { ...stats[bot.id] },
    })),
    { key: DEALER.id, title: DEALER.name, isNPC: true, role: 'dealer', id: lineup.length + 1, bank: STARTING_BANK, stats: { ...stats[DEALER.id] } },
  ];
}

/** Play every computer move until the round has a result */
function playRound(state: GameState, rng: () => number): GameState {
  for (let moves = 0; state.gameStatus === GameStatus.InProgress; moves++) {
    const key = state.controllingPlayer;
    if (!key || moves > MAX_MOVES_PER_ROUND) throw new Error(`Round ${state.round} did not finish`);
    const move = decideSeatMove(state, key, rng);
    state = move === 'hit' ? gameReducer(state, { type: GameAction.Draw, playerKey: key, deckSide: 'top', numberOfCards: 1 })
      : move === 'double' ? gameReducer(state, { type: GameAction.DoubleDown, playerKey: key })
      : gameReducer(state, { type: GameAction.Stay, playerKey: key });
  }
  return state;
}

/**
 * Build a play history for the characters by running real games, start to finish,
 * with the same reducer, turn engine and character strategies as the app. Play is
 * split into sittings: a random line-up of computer players sits down with fresh
 * banks and plays until the sitting's length is reached or every one of them is broke.
 * Stats carry from one sitting to the next.
 */
export function simulateHistory(options: SimulationOptions): SimulationResult {
  const { rounds, rng = Math.random, sessionLength = [20, 200], onProgress } = options;
  const stats: Record<string, PlayerStats> = Object.fromEntries(CHARACTERS.map((character) => [character.id, emptyStats()]));
  const net: Record<string, number> = Object.fromEntries(CHARACTERS.map((character) => [character.id, 0]));

  // the deck, bots and their bets all draw from Math.random; route it through rng for the run
  const realRandom = Math.random;
  Math.random = rng;
  let played = 0;
  let sessions = 0;
  try {
    while (played < rounds) {
      sessions += 1;
      const length = sessionLength[0] + Math.floor(rng() * (sessionLength[1] - sessionLength[0] + 1));
      let state = gameReducer(createGameState(), { type: GameAction.NewGame, players: seatsFor(chooseLineup(rng), stats) });
      // the first evaluation collects the opening antes
      state = gameReducer(state, { type: GameAction.EvaluateGame, gameStatus: state.gameStatus });

      for (let inSession = 0; inSession < length && played < rounds; inSession++) {
        state = gameReducer(state, { type: GameAction.Deal });
        if (state.playerStore.all.filter(isBot).every((player) => player.isSittingOut)) break;
        state = playRound(state, rng);
        state = gameReducer(state, { type: GameAction.EvaluateGame, gameStatus: state.gameStatus });

        state.playerStore.all.forEach((player) => {
          stats[player.key] = { ...player.stats };
          net[player.key] += player.net ?? 0;
        });
        // the log is not needed here, and copying a long one on every action is slow
        state.activityLog = [];
        played += 1;
        if (played % 500 === 0) onProgress?.(played);
      }
    }
  } finally {
    Math.random = realRandom;
  }

  return { rounds: played, sessions, stats, net };
}
