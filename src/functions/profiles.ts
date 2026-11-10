import { BOTS, CHARACTERS, DEALER, DEALER_ID, MAX_OPPONENTS, getCharacter, isBotId, isCharacterId } from "../characters";
import { playerDefaults, STARTING_BANK } from "../definitions";
import { IPlayer, IPlayerOptions, IProfileAction } from "../interfaces";
import { PlayerProfile, PlayerStats, ProfileState } from "../types";

/** The dealer's profile id; the dealer's seat key in every game */
export const DEALER_PROFILE_ID = DEALER_ID;

export const MAX_NAME_LENGTH = 20;

/**
 * How many profiles can exist, the computer characters and the dealer included.
 * The server accepts no more than this (netlify/lib/validate.ts), so creation stops here.
 */
export const MAX_PROFILES = 50;

export function emptyStats(): PlayerStats {
  return { ...playerDefaults.stats };
}

/** A fixed profile for each computer character and the dealer */
function characterProfiles(): PlayerProfile[] {
  return CHARACTERS.map((character) => ({ id: character.id, name: character.name, createdAt: 0, stats: emptyStats() }));
}

/** The profiles a new install starts with: Chris to play, the computer characters, and the dealer */
export function defaultProfileState(): ProfileState {
  return {
    profiles: [
      { id: 'chris', name: 'Chris', createdAt: 0, stats: emptyStats() },
      ...characterProfiles(),
    ],
    selectedId: 'chris',
    opponentIds: [],
  };
}

/** The profiles that can play as the human player */
export function humanProfiles(profiles: PlayerProfile[]): PlayerProfile[] {
  return profiles.filter((profile) => !isCharacterId(profile.id));
}

/**
 * Explain why a name cannot be used, or return undefined when it is acceptable.
 * Names are unique regardless of case, and the characters' names are reserved.
 */
export function validateProfileName(name: string, profiles: PlayerProfile[]): string | undefined {
  const trimmed = name.trim();
  if (trimmed === '') return 'Enter a name.';
  if (profiles.length >= MAX_PROFILES) return `There can be up to ${MAX_PROFILES} profiles. Clear application data to start over.`;
  if (trimmed.length > MAX_NAME_LENGTH) return `Names can be up to ${MAX_NAME_LENGTH} characters.`;
  const lower = trimmed.toLowerCase();
  const taken = [...profiles.map((profile) => profile.name), ...CHARACTERS.map((character) => character.name), 'Dealer'];
  if (taken.some((existing) => existing.toLowerCase() === lower)) return 'That name is already in use.';
  return undefined;
}

/** Keep only known computer characters, once each, in seating order, up to the limit */
function normalizeOpponents(ids: unknown): string[] {
  const chosen = Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && isBotId(id)) : [];
  return BOTS.map((bot) => bot.id).filter((id) => chosen.includes(id)).slice(0, MAX_OPPONENTS);
}

/**
 * Repair a profile state read from storage: fill in missing stats, make sure every
 * character and at least one human profile exist, give the characters their current
 * names, and select a human profile.
 */
export function normalizeProfileState(state: ProfileState): ProfileState {
  let profiles = state.profiles.map((profile) => ({
    ...profile,
    name: getCharacter(profile.id)?.name ?? profile.name,
    stats: { ...emptyStats(), ...profile.stats },
  }));

  const missing = characterProfiles().filter((character) => !profiles.some((profile) => profile.id === character.id));
  profiles = [...profiles, ...missing];
  if (humanProfiles(profiles).length === 0) {
    profiles = [defaultProfileState().profiles[0], ...profiles];
  }

  const humans = humanProfiles(profiles);
  const selectedId = humans.some((profile) => profile.id === state.selectedId) ? state.selectedId : humans[0].id;
  return { profiles, selectedId, opponentIds: normalizeOpponents(state.opponentIds) };
}

/**
 * Update the profile store. Returns the same state when an action has no effect.
 */
export function profileReducer(state: ProfileState, action: IProfileAction): ProfileState {
  switch (action.type) {
    case 'create': {
      if (validateProfileName(action.name, state.profiles)) return state;
      const profile: PlayerProfile = {
        id: `player-${state.profiles.length + 1}-${Date.now().toString(36)}`,
        name: action.name.trim(),
        createdAt: Date.now(),
        stats: emptyStats(),
      };
      return { ...state, profiles: [...state.profiles, profile], selectedId: profile.id };
    }

    case 'select': {
      const isHuman = humanProfiles(state.profiles).some((profile) => profile.id === action.id);
      return isHuman ? { ...state, selectedId: action.id } : state;
    }

    case 'toggleOpponent': {
      if (!isBotId(action.id)) return state;
      const seated = state.opponentIds.includes(action.id);
      if (!seated && state.opponentIds.length >= MAX_OPPONENTS) return state;
      const ids = seated ? state.opponentIds.filter((id) => id !== action.id) : [...state.opponentIds, action.id];
      return { ...state, opponentIds: normalizeOpponents(ids) };
    }

    case 'syncStats':
      return {
        ...state,
        profiles: state.profiles.map((profile) => (
          action.stats[profile.id] ? { ...profile, stats: { ...action.stats[profile.id] } } : profile
        )),
      };

    case 'replace':
      return normalizeProfileState(action.state);

    case 'reset':
      return defaultProfileState();

    default:
      return state;
  }
}

/**
 * The seats for a new game: the selected human, then the chosen computer players,
 * then the dealer. Each seat starts with that profile's lifetime stats.
 */
export function seatsFor(state: ProfileState): IPlayerOptions[] {
  const defaults = defaultProfileState().profiles;
  const humans = humanProfiles(state.profiles);
  const human = humans.find((profile) => profile.id === state.selectedId) ?? humans[0] ?? defaults[0];
  const statsFor = (id: string) => ({ ...(state.profiles.find((profile) => profile.id === id)?.stats ?? emptyStats()) });
  const bots = BOTS.filter((bot) => (state.opponentIds ?? []).includes(bot.id));

  return [
    { key: human.id, title: human.name, isNPC: false, role: 'human', id: 1, bank: STARTING_BANK, disabled: false, stats: { ...human.stats } },
    ...bots.map((bot, index): IPlayerOptions => ({
      key: bot.id, title: bot.name, isNPC: true, role: 'bot', id: index + 2, bank: STARTING_BANK, disabled: false, stats: statsFor(bot.id),
    })),
    { key: DEALER.id, title: DEALER.name, isNPC: true, role: 'dealer', id: bots.length + 2, bank: STARTING_BANK, disabled: false, stats: statsFor(DEALER.id) },
  ];
}

/** Each player's current stats, keyed by profile id */
export function collectStats(players: IPlayer[]): Record<string, PlayerStats> {
  return Object.fromEntries(players.map((player) => [player.key, { ...player.stats }]));
}

export type StatsSummary = {
  rounds: number;
  won: number;
  lost: number;
  pushed: number;
  /** undefined until a hand has been played */
  winRate?: number;
  blackjacks: number;
  busts: number;
  /** bank change across every settled hand; negative when down */
  net: number;
};

/** Turn the raw stats into the figures shown to the player */
export function summarizeStats(stats: PlayerStats): StatsSummary {
  const rounds = stats.numberOfGamesPlayed;
  const won = stats.numberOfGamesWon;
  const lost = stats.numberOfGamesLost;
  return {
    rounds,
    won,
    lost,
    pushed: Math.max(0, rounds - won - lost),
    winRate: rounds > 0 ? won / rounds : undefined,
    blackjacks: stats.numberOfTimesBlackjack,
    busts: stats.numberOfTimesBusted,
    net: stats.netResult ?? 0,
  };
}
