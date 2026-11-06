# LedgerLine API Specification

This document details every endpoint in the LedgerLine core banking engine, the permitted roles, required headers, and its exact effect on money.

## Authentication & Session

| Endpoint | Method | Permitted Roles | Required Headers | Effect on Money | Description |
|---|---|---|---|---|---|
| `/api/auth/login` | `POST` | Public (Unauthenticated) | None | None | Authenticates user credentials with lockout protection after 5 consecutive failures. Returns signed JWT bearer token. |
| `/api/auth/me` | `GET` | `ADMIN`, `HOLDER`, `AUDITOR` | `Authorization: Bearer <token>` | None | Returns profile and active role of the authenticated caller. |

---

## Accounts & Entitlements (Day 1 PM)

| Endpoint | Method | Permitted Roles | Required Headers | Effect on Money | Description |
|---|---|---|---|---|---|
| `/api/accounts` | `GET` | `HOLDER` (own), `ADMIN` (all), `AUDITOR` (all) | `Authorization: Bearer <token>` | None | Lists accessible accounts. Holders only see accounts they own or have membership in. |
| `/api/accounts/{id}` | `GET` | `HOLDER` (own), `ADMIN`, `AUDITOR` | `Authorization: Bearer <token>` | None | Returns account details and current running balance. Unentitled holders receive 404 to avoid enumeration. |
| `/api/accounts/{id}/statement` | `GET` | `HOLDER` (own), `ADMIN`, `AUDITOR` | `Authorization: Bearer <token>` | None | Ruled-ledger statement merging posted entries, refused attempts, and replayed requests in chronological order with balance after each. |

---

## Money Operations (Day 1 PM & Day 2 AM)

| Endpoint | Method | Permitted Roles | Required Headers | Effect on Money | Description |
|---|---|---|---|---|---|
| `/api/transfers` | `POST` | `HOLDER` (from own account), `ADMIN` (any) | `Authorization: Bearer <token>`, `Idempotency-Key: <uuid>` | Moves paise from source to destination account. System sum remains 0. | Transfers funds between accounts. Acquires row locks in ascending account ID order. Refused attempts logged in separate transaction. |
| `/api/deposits` | `POST` | `HOLDER` (into own account), `ADMIN` (any customer) | `Authorization: Bearer <token>`, `Idempotency-Key: <uuid>` | Debits `EXTERNAL` system account, credits customer account. | Ingests external funds into the ledger. Atomic double-entry balancing against EXTERNAL. |
| `/api/withdrawals` | `POST` | `HOLDER` (from own account), `ADMIN` (any customer) | `Authorization: Bearer <token>`, `Idempotency-Key: <uuid>` | Credits `EXTERNAL` system account, debits customer account. | Simulates cash or outgoing settlement to the external world. Guaranteed non-negative balance via DB CHECK. |
| `/api/reversals/{journalId}` | `POST` | `ADMIN` only | `Authorization: Bearer <token>`, `Idempotency-Key: <uuid>` | Creates an equal and opposite journal compensating the target journal. | Immutable correction. Original journal is never edited or deleted (`UNIQUE(reversal_of)`). |

---

## Audit & Reconciliation (Day 2 AM)

| Endpoint | Method | Permitted Roles | Required Headers | Effect on Money | Description |
|---|---|---|---|---|---|
| `/api/audit/reconciliation` | `GET` | `ADMIN`, `AUDITOR` | `Authorization: Bearer <token>` | None | Recomputes balances from all entries, compares against cached balances, and verifies system-wide sum is 0. |
| `/api/audit/verify` | `GET` | `ADMIN`, `AUDITOR` | `Authorization: Bearer <token>` | None | Traverses per-account SHA-256 hash chains from genesis to tip. Reports broken links or confirms cryptographic integrity. |
| `/api/audit/flags` | `GET` | `ADMIN`, `AUDITOR` | `Authorization: Bearer <token>` | None | Lists compliance flags (large transfers, velocity, structuring, repeated refusals). |
| `/api/audit/flags/{id}/review` | `POST` | `ADMIN` only | `Authorization: Bearer <token>` | None | Records human compliance review note and transitions flag to `REVIEWED`. |
