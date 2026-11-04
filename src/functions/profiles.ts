import { playerDefaults, STARTING_BANK } from "../definitions";
import { IPlayer, IPlayerOptions, IProfileAction } from "../interfaces";
import { PlayerProfile, PlayerStats, ProfileState } from "../types";

/** The dealer's profile id; the dealer's seat key in every game */
export const DEALER_PROFILE_ID = 'dealer';

export const MAX_NAME_LENGTH = 20;

export function emptyStats(): PlayerStats {
  return { ...playerDefaults.stats };
}

/** The profiles a new install starts with: Chris to play, and the dealer */
export function defaultProfileState(): ProfileState {
  return {
    profiles: [
      { id: 'chris', name: 'Chris', createdAt: 0, stats: emptyStats() },
      { id: DEALER_PROFILE_ID, name: 'Dealer', createdAt: 0, stats: emptyStats() },
    ],
    selectedId: 'chris',
  };
}

/** The profiles that can play as the human player */
export function humanProfiles(profiles: PlayerProfile[]): PlayerProfile[] {
  return profiles.filter((profile) => profile.id !== DEALER_PROFILE_ID);
}

/**
 * Explain why a name cannot be used, or return undefined when it is acceptable.
 * Names are unique regardless of case, and the dealer's name is reserved.
 */
export function validateProfileName(name: string, profiles: PlayerProfile[]): string | undefined {
  const trimmed = name.trim();
  if (trimmed === '') return 'Enter a name.';
  if (trimmed.length > MAX_NAME_LENGTH) return `Names can be up to ${MAX_NAME_LENGTH} characters.`;
  const lower = trimmed.toLowerCase();
  if (profiles.some((profile) => profile.name.toLowerCase() === lower)) return 'That name is already in use.';
  return undefined;
}

/**
 * Repair a profile state read from storage: fill in missing stats, make sure the
 * dealer and at least one human profile exist, and select a human profile.
 */
export function normalizeProfileState(state: ProfileState): ProfileState {
  const defaults = defaultProfileState().profiles;
  let profiles = state.profiles.map((profile) => ({ ...profile, stats: { ...emptyStats(), ...profile.stats } }));

  if (!profiles.some((profile) => profile.id === DEALER_PROFILE_ID)) {
    profiles = [...profiles, defaults[1]];
  }
  if (humanProfiles(profiles).length === 0) {
    profiles = [defaults[0], ...profiles];
  }

  const humans = humanProfiles(profiles);
  const selectedId = humans.some((profile) => profile.id === state.selectedId) ? state.selectedId : humans[0].id;
  return { profiles, selectedId };
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
      return { profiles: [...state.profiles, profile], selectedId: profile.id };
    }

    case 'select': {
      const isHuman = humanProfiles(state.profiles).some((profile) => profile.id === action.id);
      return isHuman ? { ...state, selectedId: action.id } : state;
    }

    case 'syncStats':
      return {
        ...state,
        profiles: state.profiles.map((profile) => (
          action.stats[profile.id] ? { ...profile, stats: { ...action.stats[profile.id] } } : profile
        )),
      };

    case 'reset':
      return defaultProfileState();

    default:
      return state;
  }
}

/**
 * The seats for a new game: the selected human, then the dealer.
 * Each seat starts with that profile's lifetime stats.
 */
export function seatsFor(state: ProfileState): IPlayerOptions[] {
  const defaults = defaultProfileState().profiles;
  const humans = humanProfiles(state.profiles);
  const human = humans.find((profile) => profile.id === state.selectedId) ?? humans[0] ?? defaults[0];
  const dealer = state.profiles.find((profile) => profile.id === DEALER_PROFILE_ID) ?? defaults[1];
  return [
    { key: human.id, title: human.name, isNPC: false, id: 1, bank: STARTING_BANK, disabled: false, stats: { ...human.stats } },
    { key: dealer.id, title: dealer.name, isNPC: true, id: 2, bank: STARTING_BANK, disabled: false, stats: { ...dealer.stats } },
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
  /** undefined until a round has been played */
  winRate?: number;
  blackjacks: number;
  busts: number;
  /** total of the pots won, before stakes */
  potsWon: number;
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
    potsWon: stats.totalWinnings,
  };
}
