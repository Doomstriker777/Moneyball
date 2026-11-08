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

## 4. Local Setup & How to Run

### Prerequisites
- **Java 21 JDK** (e.g. Eclipse Adoptium Temurin 21)
- **Maven 3.9+** (installed locally or via wrapper)
- **PostgreSQL 16/17** (running locally or via Docker)
- **Node.js 18+** and **npm**

### Step 1: Start PostgreSQL
If using Docker:
```bash
docker compose up -d
```
If using a native local PostgreSQL service, ensure it is listening on port `5432` with:
- **Database**: `ledgerline`
- **Username**: `postgres`
- **Password**: `postgres`

### Step 2: Run the Backend
Open a terminal in the project root:
```bash
cd backend
mvn clean test
mvn spring-boot:run
```
Flyway automatically runs all database migrations on boot.
- **Health Check**: `curl http://localhost:8080/actuator/health`
- **Swagger UI**: [`http://localhost:8080/swagger-ui.html`](http://localhost:8080/swagger-ui.html)
- **OpenAPI JSON**: `http://localhost:8080/api-docs`

### Step 3: Run the Frontend
Open a second terminal in the project root:
```bash
cd frontend
npm install
npm run dev
```
Open [`http://localhost:5173`](http://localhost:5173) in your browser to view **The Living Ledger**.

---

## 5. API Endpoints (Built So Far)

### Authentication
- `POST /api/auth/login` — Authenticate and receive JWT token.
- `GET /api/auth/me` — Inspect current user context.

### Accounts & Statements
- `GET /api/accounts` — List accessible accounts for the authenticated user.
- `GET /api/accounts/{id}` — Get single account details (returns 404 for unentitled users).
- `GET /api/accounts/{id}/statement` — Ruled-ledger statement merging posted entries with refused attempts in chronological order.

### Audit, Compliance & Administration
- `GET /api/audit/reconcile` — Real-time ledger balance recomputation and zero-sum conservation check.
- `GET /api/audit/verify` — Cryptographic SHA-256 hash-chain verification across all account entry sequences.
- `GET /api/audit/export` — Regulatory audit export bundle (.json) with full entry ledgers, attempts, flags, and offline verification instructions (Auditor only).
- `GET /api/audit/flags` — List triggered anti-fraud / AML compliance flags.
- `POST /api/audit/flags/{id}/review` — Submit human administrator review note and transition flag to REVIEWED.
- `PATCH /api/accounts/{id}/status` — Freeze or unfreeze an account (Admin only).
- `PATCH /api/accounts/{id}/overdraft-limit` — Adjust allowed overdraft limit in paise (Admin only).
- `POST /api/reversals/{journalId}` — Post immutable equal-and-opposite corrective journal with row locking (Admin only).

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

## 6. Seed Users & Accounts

All passwords are encrypted with BCrypt (cost factor 10).

| Role | Email | Password | Entitled Account | Notes |
|---|---|---|---|---|
| **ADMIN** | `admin@ledgerline.internal` | `Admin123!` | All Accounts | Back-office management, external deposits, reversals |
| **AUDITOR** | `auditor@ledgerline.internal` | `Auditor123!` | All (Read-Only) | Read-only ledger inspection and chain verification |
| **HOLDER** | `holder1@ledgerline.internal` | `Holder123!` | `ACC-100001` | Balance: ₹1,000.00 (100,000 paise) |
| **HOLDER** | `holder2@ledgerline.internal` | `Holder222!` | `ACC-100002` | Balance: ₹500.00 (50,000 paise) |
| **SYSTEM** | `system@ledgerline.internal` | *N/A* | `EXT-000000` | Balance: -₹1,500.00 (-150,000 paise) |

---

## 7. Implementation Progress Checklist

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
- [x] **Day 2 AM: `feat: idempotency, tests, reconciliation`**
  - [x] In-transaction `Idempotency-Key` tracking and atomic replay handling (`IN_PROGRESS`, `COMPLETED`, `409`, `422`)
  - [x] Immutable reversal journals with database-enforced single reversal (`UNIQUE(reversal_of)`)
  - [x] Rule-based anti-fraud flags (`LARGE_AMOUNT`, `ROUND_STRUCTURING`, `VELOCITY_LIMIT`, `REPEATED_REFUSALS`)
  - [x] Real-time reconciliation (`GET /api/audit/reconcile`) and hash chain audit (`GET /api/audit/verify`)
  - [x] Multi-threaded concurrency race tests (Conservation, No-overdraw, Opposing transfers, Concurrent replays)
  - [x] Concurrency retry wrapper outside transaction with exponential backoff & random jitter
  - [x] Automated mutation check script (`scripts/mutation-check.sh`) and threat matrix in `THREATS.md`
- [x] **Day 2 PM: `feat(ui): design system, auth, dashboard, transfer`**
  - [x] Living Ledger design system & tactile tokens (Fraunces serif, IBM Plex Mono, warm paper `#F4EFE6`, ruled lines)
  - [x] 1-Click Role Switcher bar (`ADMIN`, `HOLDER 1`, `HOLDER 2`, `AUDITOR`) with automatic JWT authentication
  - [x] Interactive Login modal with 5-attempt brute-force lockout warnings
  - [x] Account dashboard cards with live Framer Motion balance odometer flip-digit animations
  - [x] Atomic Transfer modal with live Rupee-to-paise conversion, pre-generated `Idempotency-Key`, and animated rubber stamp results (`POSTED` in green, `REFUSED` in red with survival guarantee)
  - [x] Simulated External Deposit & Cash Withdrawal modals tested against double-entry offset and overdraft limits
  - [x] Chronological Ruled-Ledger Statement viewer with running balances and stamp outcomes
  - [x] Real-time invariant header indicator (`● Σ ALL BALANCES = 0`) polling reconciliation status
- [x] **Day 3 AM: `feat(ui): statement, proof, admin, attack lab`**
  - [x] Ruled-ledger statement view with animated outcome stamps (`POSTED`, `REFUSED`, `REPLAYED`, `REVERSED`)
  - [x] Live Proof Panel ($\Sigma \text{balances} \equiv 0$ equation breakdown, discrepancy scanner, SHA-256 seal)
  - [x] Admin management panels (account freeze/unfreeze, overdraft limits, compliance flag review, journal reversals)
  - [x] Auditor read-only mode with watermark and one-click JSON audit pack export (`GET /api/audit/export`)
  - [x] Interactive Attack Lab (20-thread parallel withdrawal race, 10-thread idempotency replay, overdraft breach)
- [ ] **Day 3 PM: `chore: deploy, docs, hardening`**
  - [ ] Dockerfile and cloud deployment configuration (Render + Netlify)
  - [ ] CORS allow-listing and environment configuration
  - [ ] Final `API.md`, `THREATS.md`, and `PROMPTS.md`
  - [ ] Demo video script and walkthrough
