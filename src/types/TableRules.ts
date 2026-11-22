export const deckCounts = ['1', '2', '6', '8'] as const;
export const dealerSoft17Options = ['stand', 'hit'] as const;
export const blackjackPayouts = ['3:2', '6:5'] as const;

export type TableRules = {
  numberOfDecks: typeof deckCounts[number];
  dealerSoft17: typeof dealerSoft17Options[number];
  blackjackPayout: typeof blackjackPayouts[number];
  resplit?: boolean;
  doubleAfterSplit?: boolean;
  insurance?: boolean;
  surrender?: boolean;
};

export const defaultTableRules: TableRules = {
  numberOfDecks: '1',
  dealerSoft17: 'stand',
  blackjackPayout: '3:2',
};

export function isTableRules(value: unknown): value is TableRules {
  if (typeof value !== 'object' || value === null) return false;
  const rules = value as TableRules;
  return deckCounts.includes(rules.numberOfDecks)
    && dealerSoft17Options.includes(rules.dealerSoft17)
    && blackjackPayouts.includes(rules.blackjackPayout)
    && (rules.resplit === undefined || typeof rules.resplit === 'boolean')
    && (rules.doubleAfterSplit === undefined || typeof rules.doubleAfterSplit === 'boolean')
    && (rules.insurance === undefined || typeof rules.insurance === 'boolean')
    && (rules.surrender === undefined || typeof rules.surrender === 'boolean');
}

export const tableRulesFrom = (rules: TableRules): TableRules => ({
  numberOfDecks: rules.numberOfDecks,
  dealerSoft17: rules.dealerSoft17,
  blackjackPayout: rules.blackjackPayout,
  ...(rules.resplit ? { resplit: true } : {}),
  ...(rules.doubleAfterSplit ? { doubleAfterSplit: true } : {}),
  ...(rules.insurance ? { insurance: true } : {}),
  ...(rules.surrender ? { surrender: true } : {}),
});
