import faxePortrait from './assets/portraits/faxe.svg';
import genlyAiPortrait from './assets/portraits/genly-ai.svg';
import haberPortrait from './assets/portraits/haber.svg';
import ogionPortrait from './assets/portraits/ogion.svg';
import shevekPortrait from './assets/portraits/shevek.svg';

/**
 * How a computer character plays, each from 1 to 10.
 * - nerve: how high a total they keep hitting on
 * - aggression: how much they bet and how often they double down
 * - discipline: how often they make the textbook play rather than a gut call
 * - tilt: how much a losing streak pushes them to bet bigger and take more risks
 */
export type CharacterStats = {
  nerve: number;
  aggression: number;
  discipline: number;
  tilt: number;
};

export type CharacterStatKey = keyof CharacterStats;

export type Character = {
  /** also the character's profile id and seat key */
  id: string;
  name: string;
  nickname: string;
  /** the poker player type the character is modelled on */
  archetype: string;
  tagline: string;
  backstory: string[];
  portrait: string;
  portraitAlt: string;
  /** the portrait's background colour, used to tint the character's card */
  accent: string;
  /** absent for the dealer, who plays by house rules */
  stats?: CharacterStats;
};

/** The dealer's id; the dealer's profile id and seat key in every game */
export const DEALER_ID = 'dealer';

/** Computer players a game can seat besides the human and the dealer */
export const MAX_OPPONENTS = 4;

export const STAT_LABELS: Record<CharacterStatKey, { label: string; description: string }> = {
  nerve: { label: 'Nerve', description: 'How high a total they keep hitting on.' },
  aggression: { label: 'Aggression', description: 'How much they bet and how often they double down.' },
  discipline: { label: 'Discipline', description: 'How often they make the textbook play.' },
  tilt: { label: 'Tilt', description: 'How much a losing streak makes them bet bigger and take more risks.' },
};

/** Character names are borrowed from the novels of Ursula K. Le Guin; the characters themselves are new. */
export const NAME_CREDIT = 'Character names are borrowed, with admiration, from the novels of Ursula K. Le Guin.';

/** The computer players, in seating order */
export const BOTS: Character[] = [
  {
    id: 'ogion',
    name: 'Ogion',
    nickname: 'The Rock',
    archetype: 'Tight-passive',
    tagline: 'Thirteen is plenty.',
    backstory: [
      'Ogion ran the night ferry across the bay for thirty years and never once left the dock in a storm. He plays cards the same way: he sits, he waits, and he lets the weather pass.',
      'He stands early, bets the minimum and almost never doubles down. Other players find him restful. The house finds him expensive, slowly.',
    ],
    portrait: ogionPortrait,
    portraitAlt: 'Pixel portrait of an old man with a bald crown, a long grey beard and closed eyes, wearing a brown cloak',
    accent: '#5b7046',
    stats: { nerve: 2, aggression: 2, discipline: 8, tilt: 1 },
  },
  {
    id: 'shevek',
    name: 'Shevek',
    nickname: 'The Shark',
    archetype: 'Tight-aggressive',
    tagline: "The math doesn't care how you feel.",
    backstory: [
      'Shevek teaches statistics at a college that would rather not know where he spends his weekends. He keeps the odds of every hand in his head and a pencil behind his ear.',
      'He makes the textbook play nearly every time and presses his bets when the numbers favour him. A losing streak barely registers; he calls it variance and orders another coffee.',
    ],
    portrait: shevekPortrait,
    portraitAlt: 'Pixel portrait of a lean man with untidy dark hair and a half smile, wearing a plain grey shirt',
    accent: '#4a6283',
    stats: { nerve: 5, aggression: 7, discipline: 10, tilt: 2 },
  },
  {
    id: 'haber',
    name: 'Haber',
    nickname: 'The Maniac',
    archetype: 'Loose-aggressive',
    tagline: 'Whatever it is, double it.',
    backstory: [
      'Haber made a fortune selling self-improvement seminars and is certain the next hand will improve on the last. He talks the whole time, mostly about himself.',
      'He hits on totals that make the dealer wince, doubles whenever he is allowed, and after a loss he bets bigger to win it back. Some nights it works.',
    ],
    portrait: haberPortrait,
    portraitAlt: 'Pixel portrait of a big man with a red-brown beard and a wide toothy grin, wearing a suit and red tie',
    accent: '#d98a4e',
    stats: { nerve: 9, aggression: 10, discipline: 3, tilt: 8 },
  },
  {
    id: 'genly-ai',
    name: 'Genly Ai',
    nickname: 'The Tourist',
    archetype: 'Loose-passive',
    tagline: "One more card can't hurt. Probably.",
    backstory: [
      'Genly Ai is in town for a conference and found the card room by accident, camera still around his neck. Everyone has been very friendly, which he finds suspicious.',
      'He is still learning the rules and keeps taking one more card to be polite. He seldom raises his bet, but a bad run makes him nervous and careless.',
    ],
    portrait: genlyAiPortrait,
    portraitAlt: 'Pixel portrait of a man with dark skin, raised eyebrows and a sideways glance, wearing a fur-collared parka and a camera',
    accent: '#a9c6d6',
    stats: { nerve: 8, aggression: 2, discipline: 2, tilt: 4 },
  },
];

export const DEALER: Character = {
  id: DEALER_ID,
  name: 'Faxe',
  nickname: 'The House',
  archetype: 'The House',
  tagline: 'The house is patient.',
  backstory: [
    'Faxe has dealt at this table longer than anyone can remember and has never been seen to hurry. Faxe speaks rarely and seems to know how a hand will end before the last card turns.',
    'The house plays by fixed rules: draw below 17, stand on 17 or more. No hunches, no grudges, no tilt.',
  ],
  portrait: faxePortrait,
  portraitAlt: 'Pixel portrait of a dealer with long black hair, a gold circlet and pale eyes, wearing a white robe with a gold medallion',
  accent: '#2f5d4a',
};

export const CHARACTERS: Character[] = [...BOTS, DEALER];

export function getCharacter(id: string | undefined): Character | undefined {
  return CHARACTERS.find((character) => character.id === id);
}

export function isBotId(id: string): boolean {
  return BOTS.some((bot) => bot.id === id);
}

export function isCharacterId(id: string): boolean {
  return CHARACTERS.some((character) => character.id === id);
}
