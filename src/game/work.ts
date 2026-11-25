import { BOTS, CharacterStats, getCharacter } from './characters';
import { STARTING_BANK } from './definitions';
import { BotAccountState, CharacterWorkState, MAX_BALANCE_HISTORY, WorkTaskId } from '../../shared';

export type WorkTask = {
  id: WorkTaskId;
  label: string;
  /** short lower-case phrase used on table chips, e.g. "Away: herding goats" */
  shortLabel: string;
  /** total dollars paid when the task is finished */
  pay: number;
  /** length in days; one hand played at the table is one day (24 hours) */
  days: number;
  /** rate and flavour text shown in the task picker */
  note: string;
};

/**
 * Jobs a broke character can take while away from the table.
 * One hand played at the table is one day (24 hours).
 */
export const WORK_TASKS: readonly WorkTask[] = [
  {
    id: 'smashing-rocks',
    label: 'Smashing rocks',
    shortLabel: 'smashing rocks',
    pay: 32,
    days: 1,
    note: '$4 an hour · Honest, dull, quick',
  },
  {
    id: 'dreaming-trials',
    label: 'Sitting for effective dreaming trials',
    shortLabel: 'dreaming trials',
    pay: 150,
    days: 2,
    note: 'Pays well; results vary (The Lathe of Heaven)',
  },
  {
    id: 'herding-goats',
    label: 'Herding goats on Gont',
    shortLabel: 'herding goats',
    pay: 120,
    days: 3,
    note: 'Quiet, and the goats do not talk (A Wizard of Earthsea)',
  },
  {
    id: 'minding-ansible',
    label: 'Minding the ansible',
    shortLabel: 'minding the ansible',
    pay: 220,
    days: 4,
    note: 'Someone has to wait for the reply',
  },
  {
    id: 'divlab-posting',
    label: 'A work posting from Divlab',
    shortLabel: 'Divlab posting',
    pay: 280,
    days: 7,
    note: 'Anarres assigns the work; nobody is paid much (The Dispossessed)',
  },
  {
    id: 'gobrin-ice',
    label: 'Hauling a sledge across the Gobrin Ice',
    shortLabel: 'hauling a sledge',
    pay: 630,
    days: 7,
    note: 'Hard, cold, well paid (The Left Hand of Darkness)',
  },
  {
    id: 'weaving-baskets',
    label: 'Weaving baskets',
    shortLabel: 'weaving baskets',
    pay: 1,
    days: 7,
    note: '2 cents an hour · Almost nothing, slowly',
  },
];

export function getWorkTask(id: WorkTaskId | undefined): WorkTask {
  return WORK_TASKS.find((task) => task.id === id) ?? WORK_TASKS[0];
}

/**
 * How much money a character wants in their bank before returning to the table.
 * Raised by discipline (wants a cushion) and lowered by aggression and tilt (cannot wait).
 */
export function returnThreshold(stats: CharacterStats | undefined, minimumBet = 25): number {
  if (!stats) return minimumBet * 4;
  const antes = Math.max(1, Math.round(5 + stats.discipline - (stats.aggression + stats.tilt) * 0.5));
  return antes * minimumBet;
}

/**
 * Score a task for a character given their stats, current bank, and return threshold.
 * Disciplined characters favour strong daily wages and a comfortable cushion;
 * impatient, aggressive characters penalize every extra day away from the table.
 */
export function scoreTask(task: WorkTask, stats: CharacterStats, bank: number, threshold: number): number {
  const needed = Math.max(1, threshold - bank);
  const usefulPay = Math.min(task.pay, needed) + Math.max(0, task.pay - needed) * (stats.discipline / 10);
  const effectiveDailyRate = usefulPay / task.days;
  const coversNeedBonus = task.pay >= needed ? 25 : 0;
  const impatience = Math.max(0, stats.aggression + stats.tilt - stats.discipline);
  const waitPenalty = (task.days - 1) * (impatience * 4 + (10 - stats.discipline) * 1.5);
  return effectiveDailyRate + coversNeedBonus - waitPenalty;
}

/**
 * The task a character chooses for themselves when leaving to work or starting
 * another stint before reaching their return threshold.
 */
export function chooseTask(stats: CharacterStats | undefined, bank: number, threshold: number): WorkTaskId {
  if (!stats) return WORK_TASKS[0].id;
  let best = WORK_TASKS[0];
  let bestScore = scoreTask(best, stats, bank, threshold);
  for (const task of WORK_TASKS.slice(1)) {
    const score = scoreTask(task, stats, bank, threshold);
    if (score > bestScore) {
      best = task;
      bestScore = score;
    }
  }
  return best.id;
}

/** Days (hands) remaining on an active work stint */
export function daysRemaining(work: CharacterWorkState): number {
  const task = getWorkTask(work.taskId);
  return Math.max(0, task.days - work.daysWorked);
}

/** Append a balance point and cap the history to MAX_BALANCE_HISTORY entries */
export function appendBalance(history: number[] | undefined, bank: number): number[] {
  const base = Array.isArray(history) && history.length > 0 ? history : [STARTING_BANK];
  return [...base, bank].slice(-MAX_BALANCE_HISTORY);
}

export function defaultBotAccount(bank = STARTING_BANK): BotAccountState {
  return {
    bank,
    balanceHistory: [bank],
    allowReturn: false,
  };
}

export function defaultBotAccounts(): Record<string, BotAccountState> {
  return Object.fromEntries(BOTS.map((bot) => [bot.id, defaultBotAccount()]));
}

/** Human-readable summary of a character's current table or work status */
export function describeCharacterWork(
  characterId: string,
  account: BotAccountState | undefined,
  minimumBet = 25,
  isSeated = false,
): string {
  const character = getCharacter(characterId);
  const threshold = returnThreshold(character?.stats, minimumBet);
  const bank = account?.bank ?? STARTING_BANK;
  const work = account?.work;

  if (!work) {
    return isSeated
      ? `At the table · $${bank} (returns at $${threshold})`
      : `Available · $${bank} (returns at $${threshold})`;
  }

  if (work.status === 'ready') {
    return `Ready to return · Has $${bank} (threshold $${threshold}) and wants back in`;
  }

  const task = getWorkTask(work.taskId);
  const left = daysRemaining(work);
  const daysText = left === 1 ? '1 day left' : `${left} days left`;
  return `Away working: ${task.label} (${daysText}, +$${task.pay}) · $${bank} / $${threshold}`;
}
