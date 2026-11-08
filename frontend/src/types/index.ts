export type Role = 'ADMIN' | 'HOLDER' | 'AUDITOR';

export type AccountType = 'CUSTOMER' | 'SYSTEM';
export type AccountStatus = 'ACTIVE' | 'FROZEN';

export interface User {
  id: number;
  email: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  userId: number;
  email: string;
  role: Role;
  tokenType: string;
}

export interface Account {
  id: number;
  number: string;
  ownerId: number;
  type: AccountType;
  balance: number; // in paise (BIGINT)
  overdraftLimit: number; // in paise
  status: AccountStatus;
  version: number;
  createdAt: string;
}

export interface PostingResponse {
  journalId: number;
  kind: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'REVERSAL';
  amount: number; // in paise
  sourceAccountId: number;
  destinationAccountId: number;
  status: string;
  message: string;
  sourceBalanceAfter: number;
  destinationBalanceAfter: number;
  createdAt: string;
}

export interface TransferRequest {
  sourceAccountId: number;
  destinationAccountId?: number;
  destinationAccountNumber?: string;
  amount: number; // in paise
  reason: string;
}

export interface DepositRequest {
  accountId: number;
  amount: number; // in paise
  reason: string;
}

export interface WithdrawalRequest {
  accountId: number;
  amount: number; // in paise
  reason: string;
}

export interface StatementItem {
  timestamp: string;
  type: 'ENTRY' | 'ATTEMPT';
  journalId?: number;
  attemptId?: number;
  kind: string;
  direction?: 'DEBIT' | 'CREDIT';
  amount: number; // in paise
  runningBalance?: number; // in paise
  statusOrOutcome: 'POSTED' | 'REFUSED' | 'REPLAYED';
  reason?: string;
  counterpartyAccountNumber?: string;
}

export interface StatementResponse {
  accountId: number;
  accountNumber: string;
  type: AccountType;
  currentBalance: number;
  overdraftLimit: number;
  status: AccountStatus;
  items: StatementItem[];
}

export interface DiscrepancyItem {
  accountId: number;
  accountNumber: string;
  cachedBalance: number;
  recalculatedBalance: number;
  difference: number;
}

export interface ReconciliationReport {
  status: 'BALANCED' | 'DISCREPANCY';
  conservationHolds: boolean;
  systemSum: number;
  totalCustomerBalance: number;
  externalAccountBalance: number;
  totalAccountsScanned: number;
  totalJournalsScanned: number;
  discrepancies: DiscrepancyItem[];
  timestamp: string;
}

export interface HashChainVerificationReport {
  status: 'VERIFIED' | 'BROKEN';
  valid: boolean;
  totalEntriesScanned: number;
  totalAccountsScanned: number;
  firstBrokenEntryId?: number;
  brokenAccountId?: number;
  failureReason?: string;
  timestamp: string;
}

export type FlagSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FlagStatus = 'OPEN' | 'REVIEWED' | 'DISMISSED';

export interface Flag {
  id: number;
  journalId?: number;
  attemptId?: number;
  rule: string;
  severity: FlagSeverity;
  status: FlagStatus;
  reviewedBy?: number;
  note?: string;
  createdAt: string;
}

export interface FlagReviewRequest {
  note: string;
}

export interface ReversalRequest {
  reason: string;
}

export interface AuditPackResponse {
  system: string;
  exportVersion: string;
  exportedAt: string;
  exportedBy: string;
  reconciliation: ReconciliationReport;
  hashVerification: HashChainVerificationReport;
  accounts: Account[];
  ledgerEntries: any[];
  ledgerAttempts: any[];
  complianceFlags: Flag[];
  offlineVerificationInstructions: string;
}

export interface TransactionLogItem {
  journalId: number;
  entryId: number;
  accountId: number;
  accountNumber: string;
  kind: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'REVERSAL';
  direction: 'CREDIT' | 'DEBIT';
  amount: number; // in paise
  balanceAfter: number; // in paise
  reason: string;
  counterpartyAccountId?: number;
  counterpartyAccountNumber?: string;
  hash: string;
  createdAt: string;
}



