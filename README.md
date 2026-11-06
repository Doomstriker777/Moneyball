# LedgerLine: The Living Ledger

> An immutable, append-only, double-entry core banking engine designed for strict mathematical integrity, deadlock-free concurrency, and cryptographic auditability.

---

## 1. Project Pitch & Philosophy

Most fintech backends store balances as simple mutable columns with implicit trust in application-level checks. Under concurrent race conditions, network retries, or partial rollbacks, balances drift and audit trails vanish.

**LedgerLine** is built like an accountant's physical ledger:
- **Strict Double-Entry**: Every movement of money balances debits and credits across accounts.
- **Global Conservation Invariant**: Across all accounts—including the system `EXTERNAL` account representing the outside world—`SUM(balances) == 0` at all times.
- **Append-Only Immutability**: Postgres triggers block `UPDATE`, `DELETE`, and `TRUNCATE` operations on transaction journals and ledger entries. History is immutable; mistakes are corrected solely via equal-and-opposite reversal journals.
- **Cryptographic Hash Chain**: Every entry embeds a SHA-256 hash chaining `prev_hash` to the new balance state, making retroactive tampering mathematically impossible.
- **The Living Ledger UI**: Styled as an editorial accountant's ledger book with warm paper, green rules, and animated rubber stamps (`POSTED`, `REFUSED`, `REPLAYED`).

---

## 2. Double-Entry Model & Mathematical Invariant (Plain English)

In LedgerLine, money is never created or destroyed out of thin air. Instead, the universe of money is closed by a single system account named `EXTERNAL` (Account ID 1, `EXT-000000`).

### The Double-Entry Rules:
1. **Customer Deposit (+₹100)**: Customer account is CREDITED 10,000 paise (+10,000). The `EXTERNAL` account is DEBITED 10,000 paise (-10,000).
   $$\text{Sum} = (+10,000) + (-10,000) = 0$$
2. **Customer Withdrawal (-₹50)**: Customer account is DEBITED 5,000 paise (-5,000). The `EXTERNAL` account is CREDITED 5,000 paise (+5,000).
   $$\text{Sum} = (-5,000) + (+5,000) = 0$$
3. **Internal Transfer (A → B, ₹30)**: Source Customer A is DEBITED 3,000 paise (-3,000). Destination Customer B is CREDITED 3,000 paise (+3,000).
   $$\text{Sum} = (-3,000) + (+3,000) = 0$$

### The Conservation Invariant:
$$\sum_{\text{all accounts}} \text{balance} \equiv 0$$
At any second, the sum of all customer account balances is exactly offset by the negative balance of the `EXTERNAL` account. Even if the application crashes halfway through an operation, PostgreSQL's deferred constraint trigger (`trg_journal_balanced`) validates that `SUM(credits) == SUM(debits)` before transaction commit, guaranteeing zero drift.

---

## 3. Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Backend** | Spring Boot 3.3.5, Java 21 | Spring Data JPA, Spring Security, Spring Validation, Lombok, Actuator |
| **Database** | PostgreSQL 16/17 | Flyway Migrations, Append-Only Triggers, Deferred Constraint Triggers |
| **Security** | JJWT (io.jsonwebtoken 0.12.6) | Stateless Bearer JWT, BCrypt password hashing, 5-attempt lockout |
| **API Docs** | SpringDoc OpenAPI 2.6.0 | Swagger UI with JWT Bearer Authentication at `/swagger-ui.html` |
| **Frontend** | React 18, Vite, TypeScript | TanStack Query, Framer Motion, Lucide Icons, Living Ledger Design Tokens |
| **Container & CI** | Docker Compose, Testcontainers | Multi-threaded concurrency testing |

---

## 4. API Endpoints (Built So Far)

### Authentication
- `POST /api/auth/login` — Authenticate and receive JWT token.
- `GET /api/auth/me` — Inspect current user context.

### Accounts & Statements
- `GET /api/accounts` — List accessible accounts for the authenticated user.
- `GET /api/accounts/{id}` — Get single account details (returns 404 for unentitled users).
- `GET /api/accounts/{id}/statement` — Ruled-ledger statement merging posted entries with refused attempts in chronological order.

### Money Operations
- `POST /api/deposits` — Ingest external funds (Debits EXTERNAL, Credits Customer).
- `POST /api/withdrawals` — Outgoing cash settlement (Debits Customer, Credits EXTERNAL).
- `POST /api/transfers` — Internal transfer between accounts with deadlock-free ordered locking.

### Example `curl` Calls:

**1. Login as Holder 1**:
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"holder1@ledgerline.internal","password":"Holder123!"}'
```

**2. Transfer ₹150.00 from Holder 1 to Holder 2**:
```bash
curl -X POST http://localhost:8080/api/transfers \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: c9b22e1b-7a3b-4c5c-9c60-e8f0a1234567" \
  -d '{
    "sourceAccountId": 2,
    "destinationAccountId": 3,
    "amount": 15000,
    "reason": "Payment for books"
  }'
```

**3. Inspect Ruled-Ledger Statement**:
```bash
curl -X GET http://localhost:8080/api/accounts/2/statement \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 5. Seed Users & Accounts

All passwords are encrypted with BCrypt (cost factor 10).

| Role | Email | Password | Entitled Account | Notes |
|---|---|---|---|---|
| **ADMIN** | `admin@ledgerline.internal` | `Admin123!` | All Accounts | Back-office management, external deposits, reversals |
| **AUDITOR** | `auditor@ledgerline.internal` | `Auditor123!` | All (Read-Only) | Read-only ledger inspection and chain verification |
| **HOLDER** | `holder1@ledgerline.internal` | `Holder123!` | `ACC-100001` | Balance: ₹1,000.00 (100,000 paise) |
| **HOLDER** | `holder2@ledgerline.internal` | `Holder222!` | `ACC-100002` | Balance: ₹500.00 (50,000 paise) |
| **SYSTEM** | `system@ledgerline.internal` | *N/A* | `EXT-000000` | Balance: -₹1,500.00 (-150,000 paise) |

---

## 6. Implementation Progress Checklist

- [x] **Day 1 AM: `feat: scaffold, schema, auth`**
  - [x] Monorepo layout (`/backend`, `/frontend`, `/docs`, `/scripts`, config files)
  - [x] Flyway migrations (tables, constraints, triggers, app role)
  - [x] Seed data (ADMIN, AUDITOR, HOLDERS, SYSTEM account)
  - [x] Spring Security + JWT authentication with 5-attempt lockout
  - [x] Global RFC 7807 `ProblemDetail` exception handler
  - [x] Baseline test suite and invariant verification
  - [x] React + Vite + TypeScript frontend with Living Ledger tokens
  - [x] `PROMPTS.md` self-audit log and `THREATS.md` threat model
- [x] **Day 1 PM: `feat: ledger core`**
  - [x] Account and statement endpoints (`GET /api/accounts`, `/api/accounts/{id}/statement`)
  - [x] Double-entry posting service (deposit, withdrawal, transfer)
  - [x] Ordered pessimistic locking (`SELECT ... FOR UPDATE` in ascending ID order)
  - [x] Refused-attempt audit logging via `REQUIRES_NEW`
  - [x] Per-account SHA-256 hash chaining
  - [x] Service-layer entitlement checks (404 on unentitled accounts to prevent enumeration)
  - [x] Integration test suite for money movements and statement generation
- [ ] **Day 2 AM: `feat: idempotency, tests, reconciliation`**
  - [ ] In-transaction `Idempotency-Key` tracking and replay handling
  - [ ] Immutable reversal journals (`UNIQUE(reversal_of)`)
  - [ ] Rule-based compliance flags
  - [ ] Reconciliation and hash-chain verification endpoints
  - [ ] Full concurrent test suite (conservation, overdraw, deadlocks, replays)
  - [ ] Automated mutation check script (`scripts/mutation-check.sh`)
- [ ] **Day 2 PM: `feat(ui): design system, auth, dashboard, transfer`**
  - [ ] Living Ledger design system & typography (Fraunces, IBM Plex Mono)
  - [ ] Authentication screens and session management
  - [ ] Account dashboard with odometer number animations
  - [ ] Transfer and deposit forms with automatic idempotency keys
- [ ] **Day 3 AM: `feat(ui): statement, proof, admin, attack lab`**
  - [ ] Ruled-ledger statement view with animated outcome stamps
  - [ ] Live Proof Panel (`Σ balances = 0`, cryptographic seal status)
  - [ ] Admin management panels (users, overdrafts, flags, reversals)
  - [ ] Auditor read-only mode with watermark
  - [ ] Interactive Attack Lab (concurrency race simulation)
- [ ] **Day 3 PM: `chore: deploy, docs, hardening`**
  - [ ] Dockerfile and cloud deployment configuration (Render + Netlify)
  - [ ] CORS allow-listing and environment configuration
  - [ ] Final `API.md`, `THREATS.md`, and `PROMPTS.md`
  - [ ] Demo video script and walkthrough
