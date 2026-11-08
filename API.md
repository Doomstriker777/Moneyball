# Moneyball: REST API Specification

> **Engine Architecture**: Immutable, Append-Only, Double-Entry Core Banking  
> **Precision**: Strict Integer Paise (`BIGINT`). Zero floating-point arithmetic.  
> **Base URL**: `http://localhost:8080` (or `https://moneyball-7rh5.onrender.com`)  
> **Interactive Documentation**: Swagger UI at [`/swagger-ui.html`](http://localhost:8080/swagger-ui.html) | OpenAPI JSON at `/api-docs`

---

## 1. Authentication & Session

### `POST /api/auth/register`
Registers a new user account with `HOLDER` (Customer) or `AUDITOR` role. If registering as `HOLDER`, a customer checking account with ₹0.00 initial balance is automatically provisioned and linked. `ADMIN` role registration is strictly prohibited.

- **Permitted Roles**: Public (Unauthenticated)
- **Effect on Money**: None (opens a customer account with 0 balance for HOLDER)
- **Request Body**:
  ```json
  {
    "email": "newcustomer@example.com",
    "password": "Password123!",
    "role": "HOLDER"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "userId": 6,
    "email": "newcustomer@example.com",
    "role": "HOLDER",
    "tokenType": "Bearer"
  }
  ```
- **Error `400 Bad Request`**: If `role` is `ADMIN`, or email is already registered.

### `POST /api/auth/login`
Authenticates user credentials. Returns a signed JWT token. Accounts lock for 15 minutes after 5 consecutive failed attempts.

- **Permitted Roles**: Public (Unauthenticated)
- **Effect on Money**: None
- **Request Body**:
  ```json
  {
    "email": "holder1@ledgerline.internal",
    "password": "Holder123!"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "userId": 3,
    "email": "holder1@ledgerline.internal",
    "role": "HOLDER",
    "tokenType": "Bearer"
  }
  ```

### `GET /api/auth/me`
Inspects profile and active roles of the current JWT bearer.

- **Permitted Roles**: `ADMIN`, `HOLDER`, `AUDITOR`
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**:
  ```json
  {
    "id": 3,
    "email": "holder1@ledgerline.internal",
    "role": "HOLDER"
  }
  ```

---

## 2. Accounts & Statements

### `GET /api/accounts`
Lists accessible accounts. Holders only see accounts they own or have membership in. Administrators and auditors see all accounts.

- **Permitted Roles**: `HOLDER` (own), `ADMIN` (all), `AUDITOR` (all)
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**:
  ```json
  [
    {
      "id": 2,
      "number": "ACC-100001",
      "ownerId": 3,
      "type": "CUSTOMER",
      "balance": 100000,
      "overdraftLimit": 0,
      "status": "ACTIVE",
      "version": 1,
      "createdAt": "2026-11-01T00:00:00Z"
    }
  ]
  ```

### `GET /api/accounts/{id}`
Returns details for a single account. Unentitled users receive `404 Not Found` (anti-enumeration defense).

- **Permitted Roles**: `HOLDER` (own), `ADMIN`, `AUDITOR`
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: (Account object as above)
- **Response `404 Not Found`**: (If caller does not own the account)

### `GET /api/accounts/{id}/statement`
Ruled-ledger statement merging posted entries with refused attempts and cached replays in strict chronological order with calculated running balances.

- **Permitted Roles**: `HOLDER` (own), `ADMIN`, `AUDITOR`
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**:
  ```json
  {
    "accountId": 2,
    "accountNumber": "ACC-100001",
    "type": "CUSTOMER",
    "currentBalance": 85000,
    "overdraftLimit": 0,
    "status": "ACTIVE",
    "items": [
      {
        "timestamp": "2026-11-08T12:00:00Z",
        "type": "ENTRY",
        "journalId": 4,
        "kind": "TRANSFER",
        "direction": "DEBIT",
        "amount": 15000,
        "runningBalance": 85000,
        "statusOrOutcome": "POSTED",
        "reason": "Payment for books",
        "counterpartyAccountNumber": "ACC-100002"
      }
    ]
  }
  ```

### `PATCH /api/accounts/{id}/status`
Freezes or unfreezes an account. Frozen accounts reject all debit and credit movements.

- **Permitted Roles**: `ADMIN` only
- **Query Params**: `status=ACTIVE` or `status=FROZEN`
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: (Updated Account object)

### `PATCH /api/accounts/{id}/overdraft-limit`
Adjusts permitted overdraft limit for customer accounts in integer paise.

- **Permitted Roles**: `ADMIN` only
- **Query Params**: `limit=<paise_integer>`
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: (Updated Account object)

---

## 3. Money Operations (Double-Entry Engine)

> **Concurrency Rule**: All money endpoints acquire pessimistic locks (`SELECT ... FOR UPDATE`) in strict ascending ID order (`min(src, dst)` then `max(src, dst)`).  
> **Deduplication**: `Idempotency-Key` header is mandatory; concurrent duplicates return cached replies (`200 OK`, `status: REPLAYED`).

### `POST /api/transfers`
Atomically moves funds between accounts.

- **Permitted Roles**: `HOLDER` (from own account), `ADMIN` (any)
- **Headers**: `Authorization: Bearer <token>`, `Idempotency-Key: <UUID>`
- **Effect on Money**: Debits Source, Credits Destination. Total bank balance unchanged ($\Delta \Sigma = 0$).
- **Request Body**:
  ```json
  {
    "sourceAccountId": 2,
    "destinationAccountId": 3,
    "amount": 15000,
    "reason": "Payment for books"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "journalId": 4,
    "kind": "TRANSFER",
    "amount": 15000,
    "sourceAccountId": 2,
    "destinationAccountId": 3,
    "status": "POSTED",
    "message": "Transfer posted successfully",
    "sourceBalanceAfter": 85000,
    "destinationBalanceAfter": 65000,
    "createdAt": "2026-11-08T12:00:00Z"
  }
  ```

### `POST /api/deposits`
Ingests external funds into a customer account by balancing against `EXTERNAL` system reserve (Account 1).

- **Permitted Roles**: `HOLDER` (into own account), `ADMIN` (any customer)
- **Headers**: `Authorization: Bearer <token>`, `Idempotency-Key: <UUID>`
- **Effect on Money**: Debits `EXTERNAL` (Account 1), Credits Customer. Net bank balance remains 0.
- **Request Body**:
  ```json
  {
    "accountId": 2,
    "amount": 50000,
    "reason": "Salary credit"
  }
  ```

### `POST /api/withdrawals`
Simulates outgoing settlement or cash withdrawal.

- **Permitted Roles**: `HOLDER` (from own account), `ADMIN` (any customer)
- **Headers**: `Authorization: Bearer <token>`, `Idempotency-Key: <UUID>`
- **Effect on Money**: Debits Customer, Credits `EXTERNAL` (Account 1). Guaranteed non-negative balance by DB constraint.
- **Request Body**:
  ```json
  {
    "accountId": 2,
    "amount": 20000,
    "reason": "ATM cash withdrawal"
  }
  ```

### `POST /api/reversals/{journalId}`
Posts an immutable equal-and-opposite corrective journal inverting the legs of the target journal. Duplicate reversal is prevented by database unique index `UNIQUE(reversal_of)`.

- **Permitted Roles**: `ADMIN` only
- **Headers**: `Authorization: Bearer <token>`, `Idempotency-Key: <UUID>`
- **Request Body**:
  ```json
  {
    "reason": "Customer dispute resolution"
  }
  ```
- **Response `200 OK`**: (PostingResponse indicating REVERSAL)

---

## 4. Audit, Compliance & Invariants

### `GET /api/audit/reconcile` (or `/reconciliation`)
Recomputes all account balances from raw ledger legs and verifies the fundamental zero-sum conservation invariant.

- **Permitted Roles**: `ADMIN`, `AUDITOR`
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**:
  ```json
  {
    "status": "BALANCED",
    "conservationHolds": true,
    "systemSum": 0,
    "totalCustomerBalance": 150000,
    "externalAccountBalance": -150000,
    "totalAccountsScanned": 3,
    "totalJournalsScanned": 4,
    "discrepancies": [],
    "timestamp": "2026-11-08T12:00:00Z"
  }
  ```

### `GET /api/audit/verify`
Traverses per-account cryptographic SHA-256 hash chains from genesis to tip. Reports broken links or confirms cryptographic integrity.

- **Permitted Roles**: `ADMIN`, `AUDITOR`
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**:
  ```json
  {
    "status": "VERIFIED",
    "valid": true,
    "totalEntriesScanned": 8,
    "totalAccountsScanned": 3,
    "firstBrokenEntryId": null,
    "brokenAccountId": null,
    "failureReason": null,
    "timestamp": "2026-11-08T12:00:00Z"
  }
  ```

### `GET /api/audit/export`
Exports complete verifiable audit bundle (.json) with full entry ledgers, attempts, compliance flags, and offline verification instructions.

- **Permitted Roles**: `AUDITOR` only
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**:
  ```json
  {
    "system": "Moneyball / LedgerLine Core Banking Engine",
    "exportVersion": "1.0-AUDIT-FINAL",
    "exportedAt": "2026-11-08T12:00:00Z",
    "exportedBy": "auditor@ledgerline.internal",
    "reconciliation": { ... },
    "hashVerification": { ... },
    "accounts": [ ... ],
    "ledgerEntries": [ ... ],
    "ledgerAttempts": [ ... ],
    "complianceFlags": [ ... ],
    "offlineVerificationInstructions": "To independently verify hash chains without the application server..."
  }
  ```

### `GET /api/audit/flags`
Lists heuristic anomaly and AML flags.

- **Permitted Roles**: `ADMIN`, `AUDITOR`
- **Query Params**: `status=OPEN` or `status=REVIEWED` (optional)
- **Headers**: `Authorization: Bearer <token>`

### `POST /api/audit/flags/{id}/review`
Records administrator review note and transitions flag to `REVIEWED`.

- **Permitted Roles**: `ADMIN` only
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "note": "Verified KYC documents; approved legitimate high-volume wire."
  }
  ```
