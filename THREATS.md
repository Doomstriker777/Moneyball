# LedgerLine: Threat Model & Security Invariants

This document outlines the threat landscape, structural countermeasures, automated test verifications, and accepted operational risks for LedgerLine.

## Threat Analysis & Countermeasures

| # | Threat / Attack Vector | Architectural Mitigation | Verification Test | Accepted Risk & Rationale |
|---|---|---|---|---|
| 1 | **Race condition on balance check (Overdraw)** | Pessimistic locking `SELECT ... FOR UPDATE` in strict ascending ID order inside `@Transactional(READ_COMMITTED)`. Balance checked after lock is held. Second-layer defense: PostgreSQL `CHECK (balance >= -overdraft_limit)`. | `AuthControllerTest` (Seed check), Concurrency tests in Day 2 AM | None. Database-level CHECK guarantees overdraw is impossible even if application code is modified. |
| 2 | **Deadlock under concurrent opposing transfers** | Strict ascending ID ordering: `first = min(srcId, dstId)`, `second = max(srcId, dstId)`. Both accounts locked in global total order. | Opposing transfer race test (100 parallel threads A→B and B→A) | Minimal lock wait timeout; Hikari pool limits prevent thread starvation. |
| 3 | **Network retry duplicate payment (Double Spend)** | Mandatory `Idempotency-Key` header with database table `idempotency_keys` storing SHA-256 `request_hash`, status, and journal link with `UNIQUE(user_id, key)`. `ON CONFLICT` atomic insertion. | Idempotent replay race test (10 concurrent identical calls) | Replay attacks with altered payloads yield 422 Unprocessable Entity. |
| 4 | **Vanishing audit trail on transaction rollback** | Refused and replayed attempts are recorded in `ledger_attempts` using a dedicated service method marked `@Transactional(propagation = Propagation.REQUIRES_NEW)` executed outside the failed posting transaction. | Refusal persistence test | Requires a separate database connection from the Hikari connection pool during failure handling. |
| 5 | **History rewriting / balance tampering** | Database triggers `BEFORE UPDATE OR DELETE` and `BEFORE TRUNCATE` on `journals`, `ledger_entries`, and `ledger_attempts` raise Postgres exceptions. Cryptographic SHA-256 hash chaining per account (`prev_hash` -> `hash`). | Append-only SQL tamper test and `GET /api/audit/verify` verification | Direct superuser tampering at the database server level can bypass triggers; however, it breaks the SHA-256 hash chain and is immediately flagged by `/api/audit/verify`. |
| 6 | **Account enumeration & unauthorized debit** | Entitlement checks performed in the service layer against `account_members`. Returns `404 Not Found` (rather than `403 Forbidden`) when a user queries an account they do not own. | Authorization test suite | None. |
| 7 | **Credential stuffing / Brute-force attacks** | Failed login attempts tracked per user; account automatically locked after 5 consecutive failures for 15 minutes. | `AuthControllerTest` bad password and lockout test | Denial-of-service on individual user account if attacker targets known email; mitigated by lockout duration and rate-limiting. |

---

## Mutation Check Results (Day 1 AM Baseline)

The mutation check script (`scripts/mutation-check.sh`) will systematically disable individual defenses in Day 2 AM and verify that the corresponding test fails.

| Defense Mutation | Expected Behavior | Actual Behavior | Status |
|---|---|---|---|
| Remove `CHECK (balance >= -overdraft_limit)` | Negative balance allowed in bypass test | Test catches negative balance | Scheduled Day 2 AM |
| Remove `PESSIMISTIC_WRITE` lock | Race condition occurs under 20 concurrent withdrawals | Concurrency race fails | Scheduled Day 2 AM |
| Remove `UNIQUE(user_id, key)` on idempotency | Duplicate payments created | Replay test fails | Scheduled Day 2 AM |
| Remove append-only trigger | Updates to entries succeed silently | Immutability test fails | Scheduled Day 2 AM |
