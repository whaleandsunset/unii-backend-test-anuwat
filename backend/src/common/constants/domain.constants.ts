export const GRADES = ['A', 'B', 'C', 'D'] as const;

export const TRANSACTION_TYPES = ['BUY', 'SELL'] as const;

export type Grade = (typeof GRADES)[number];

export type TransactionType = (typeof TRANSACTION_TYPES)[number];
