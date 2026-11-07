# LedgerLine: Threat Model & Security Invariants

This document outlines the threat landscape, structural countermeasures, automated test verifications, mutation check results, and accepted operational risks for LedgerLine.

---

## 1. Threat Analysis & Countermeasures

| # | Threat / Attack Vector | Architectural Mitigation | Verification Test | Accepted Risk & Rationale |
|---|---|---|---|---|
| 1 | **Race condition on balance check (Overdraw)** | Pessimistic row locking `SELECT ... FOR UPDATE` in strict ascending ID order inside `@Transactional(isolation = READ_COMMITTED)`. Balance check occurs *after* the lock is acquired. Second-layer defense: PostgreSQL constraint `CHECK (balance >= -overdraft_limit)`. | `ConcurrencyAndIntegrityIntegrationTest#noOverdrawConcurrentRace` (20 concurrent threads on balance 100) | None. Database-level CHECK guarantees overdraw is impossible even if application code is bypassed or mutated. |
| 2 | **Deadlock under concurrent opposing transfers** | Strict ascending ID ordering: `first = min(srcId, dstId)`, `second = max(srcId, dstId)`. Both accounts are locked in global total order. Retry with exponential backoff and jitter outside transaction for transient locks. | `ConcurrencyAndIntegrityIntegrationTest#opposingTransfersNoDeadlock` (50 concurrent opposing transfers A→B and B→A) | Minimal lock wait timeout; Hikari pool limits (50 connections) prevent thread starvation. |
| 3 | **Network retry duplicate payment (Double Spend)** | Mandatory `Idempotency-Key` header with database table `idempotency_keys` storing SHA-256 `request_hash`, status (`IN_PROGRESS`, `COMPLETED`), and journal link with `UNIQUE(user_id, key)`. `ON CONFLICT DO NOTHING` atomic insertion. | `ConcurrencyAndIntegrityIntegrationTest#idempotentReplayConcurrentRace` & `idempotentReplaySequentialTest` | Replay attacks with altered payloads yield 422 Unprocessable Entity. Concurrent in-flight replay returns 409 Conflict. |
| 4 | **Vanishing audit trail on transaction rollback** | Refused and replayed attempts are recorded in `ledger_attempts` using a dedicated service method marked `@Transactional(propagation = Propagation.REQUIRES_NEW)` executed outside the failed posting transaction. | `PostingIntegrationTest#insufficientFundsProducesRefusedAttemptSurvivingRollback` | Requires a separate database connection from the Hikari connection pool during failure handling. Hikari pool sized at 50 to accommodate nested connections. |
| 5 | **History rewriting / balance tampering** | Database triggers `BEFORE UPDATE OR DELETE` and `BEFORE TRUNCATE` on `journals`, `ledger_entries`, and `ledger_attempts` raise Postgres exceptions. Cryptographic SHA-256 hash chaining per account (`prev_hash` -> `hash`). `GET /api/audit/verify` reports broken links. | `ConcurrencyAndIntegrityIntegrationTest#reconciliationAndHashChainVerification` | Direct superuser tampering at the database server level can bypass triggers; however, it breaks the SHA-256 hash chain and is immediately flagged by `/api/audit/verify`. |
| 6 | **Account enumeration & unauthorized debit** | Entitlement checks performed in the service layer against `account_members`. Returns `404 Not Found` (rather than `403 Forbidden`) when a user queries an account they do not own. | `PostingIntegrationTest#unauthorizedTransferReturns404AntiEnumeration` | Prevents attackers from distinguishing between non-existent accounts and private accounts. |
| 7 | **Credential stuffing / Brute-force attacks** | Failed login attempts tracked per user; account automatically locked after 5 consecutive failures for 15 minutes. | `AuthControllerTest#accountLockedAfterConsecutiveFailedAttempts` | Mitigated by lockout duration and rate-limiting. |
| 8 | **Double-Entry Asymmetry (Conservation Violation)** | Enforced by deferred trigger `check_journal_balanced()` checking `SUM(credits) = SUM(debits)` at transaction commit. Real-time reconciliation endpoint `GET /api/audit/reconcile` checks `SUM(all balances) == 0`. | `ConcurrencyAndIntegrityIntegrationTest#conservationAcrossRandomOperations` (200 multi-threaded randomized operations) | None. Asymmetric journals cannot commit under any circumstance. |

---

## 2. Concurrency & Mutation Check Results (Day 2 AM)

The automated mutation check script (`scripts/mutation-check.sh`) systematically introduces single-point faults into the source code to prove that our concurrency and integrity test suite catches every vulnerability.

| # | Defense Mutation Injected | Architectural Fault Simulated | Target Verification Test | Actual Observed Behavior | Result |
|---|---|---|---|---|---|
| **M1** | Disabled `IdempotencyService` replay cache check | Replay attack vulnerability | `idempotentReplayConcurrentRace` | 10 concurrent requests created duplicate journals; test assertion `assertThat(journalCount).isEqualTo(1)` failed. | **CAUGHT** ✓ |
| **M2** | Removed balance check in `PostingService` | Check-then-act omission / Overdraw | `noOverdrawConcurrentRace` | Concurrent withdrawals succeeded beyond account balance; database `CHECK (balance >= -overdraft_limit)` triggered exception or final balance mismatch. | **CAUGHT** ✓ |
| **M3** | Commented out `debitEntry` creation in `PostingService` | Asymmetric single-leg journal creation | `conservationAcrossRandomOperations` | PostgreSQL trigger `trg_check_journal_balanced` rejected transaction with `credits != debits`; test caught exception. | **CAUGHT** ✓ |
| **M4** | Inverted lock ordering to argument order (`sourceId` then `destId`) | Deadlock cycle vulnerability | `opposingTransfersNoDeadlock` | Threads deadlocked waiting on cyclic cross-locks; `ExecutorService` timed out and test failed. | **CAUGHT** ✓ |
| **M5** | Tampered with previous entry hash in database seed | Silent retroactive balance alteration | `reconciliationAndHashChainVerification` | `GET /api/audit/verify` returned `status: BROKEN`, identifying `firstBrokenEntryId` and cryptographic mismatch. | **CAUGHT** ✓ |

---

## 3. Deliberately Accepted Risks & Out-of-Scope Architecture

1. **Multi-Currency**: LedgerLine is strictly single-currency (INR paise, `BIGINT`). Multi-currency FX conversions, cross-currency rates, and currency-specific precision models are deliberately omitted to preserve core double-entry simplicity.
2. **Scheduled & Batch Transfers**: Recurring transactions or scheduled ACH/NEFT batches are out of scope. Every transfer is synchronous, atomic, and bounded by transaction locks.
3. **Holds / Authorizations (Two-Phase Escrow)**: Credit card-style authorizations and pending holds are excluded; all operations immediately debit and credit active ledger balances.
4. **JWT Refresh Tokens**: Access tokens are stateless with 24-hour expiration. Refresh tokens and server-side token revocation blacklists are omitted in favor of simplified authentication.
5. **Database Superuser Trigger Bypass**: While database triggers prevent modification by the application role (`ledger_app`), a DBA connecting as `postgres` superuser has privilege to alter or drop triggers. LedgerLine mitigates this via per-account SHA-256 cryptographic hash chains; any DB-level alteration causes `GET /api/audit/verify` to fail.
