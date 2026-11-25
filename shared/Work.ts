export const workTaskIds = [
  'smashing-rocks',
  'dreaming-trials',
  'herding-goats',
  'minding-ansible',
  'divlab-posting',
  'gobrin-ice',
  'weaving-baskets',
] as const;

export type WorkTaskId = typeof workTaskIds[number];

export type WorkStatus = 'working' | 'ready';

/** How a character's away-working stint stands right now */
export type CharacterWorkState = {
  status: WorkStatus;
  taskId: WorkTaskId;
  /** days (hands) completed on the current task so far */
  daysWorked: number;
};

/**
 * A computer character's persistent bank, balance history, and away-working state.
 * Kept on their profile across games and on GameState while a game is in play so
 * unseated characters also advance when hands are played.
 */
export type BotAccountState = {
  bank: number;
  balanceHistory: number[];
  work?: CharacterWorkState;
  /** player-chosen task override; lasts until the character returns to the table */
  taskOverride?: WorkTaskId;
  /** whether the character rejoins automatically once their bank reaches their threshold */
  allowReturn?: boolean;
};

/** Maximum number of balance points kept in browser storage and synced to the server */
export const MAX_BALANCE_HISTORY = 200;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function isWorkTaskId(value: unknown): value is WorkTaskId {
  return typeof value === 'string' && (workTaskIds as readonly string[]).includes(value);
}

export function isCharacterWorkState(value: unknown): value is CharacterWorkState {
  return isRecord(value)
    && (value.status === 'working' || value.status === 'ready')
    && isWorkTaskId(value.taskId)
    && Number.isInteger(value.daysWorked)
    && (value.daysWorked as number) >= 0
    && (value.daysWorked as number) <= 30;
}

export function isBalanceHistory(value: unknown): value is number[] {
  return Array.isArray(value)
    && value.length <= MAX_BALANCE_HISTORY
    && value.every((item) => typeof item === 'number' && Number.isFinite(item) && item >= 0);
}

export function isBotAccountState(value: unknown): value is BotAccountState {
  return isRecord(value)
    && typeof value.bank === 'number' && Number.isFinite(value.bank) && value.bank >= 0
    && isBalanceHistory(value.balanceHistory)
    && (value.work === undefined || isCharacterWorkState(value.work))
    && (value.taskOverride === undefined || isWorkTaskId(value.taskOverride))
    && (value.allowReturn === undefined || typeof value.allowReturn === 'boolean');
}

export function cloneBotAccount(account: BotAccountState): BotAccountState {
  return {
    bank: account.bank,
    balanceHistory: account.balanceHistory.slice(-MAX_BALANCE_HISTORY),
    ...(account.work ? { work: { status: account.work.status, taskId: account.work.taskId, daysWorked: account.work.daysWorked } } : {}),
    ...(account.taskOverride ? { taskOverride: account.taskOverride } : {}),
    ...(account.allowReturn !== undefined ? { allowReturn: account.allowReturn } : {}),
  };
}

export function cloneBotAccounts(accounts: Record<string, BotAccountState> | undefined): Record<string, BotAccountState> {
  if (!accounts) return {};
  return Object.fromEntries(Object.entries(accounts).map(([id, account]) => [id, cloneBotAccount(account)]));
}
