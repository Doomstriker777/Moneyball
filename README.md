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

## 2. Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Backend** | Spring Boot 3.3.5, Java 21 | Spring Data JPA, Spring Security, Spring Validation, Lombok, Actuator |
| **Database** | PostgreSQL 16/17 | Flyway Migrations, Append-Only Triggers, Deferred Constraint Triggers |
| **Security** | JJWT (io.jsonwebtoken 0.12.6) | Stateless Bearer JWT, BCrypt password hashing, 5-attempt lockout |
| **API Docs** | SpringDoc OpenAPI 2.6.0 | Swagger UI with JWT Bearer Authentication at `/swagger-ui.html` |
| **Frontend** | React 18, Vite, TypeScript | TanStack Query, Framer Motion, Lucide Icons, Living Ledger Design Tokens |
| **Container & CI** | Docker Compose, Testcontainers | Multi-threaded concurrency testing |

---

## 3. Monorepo Layout

```
ledgerline/
├── backend/                       # Spring Boot 3 & Java 21 Application
│   ├── src/main/java/com/ledgerline/
│   │   ├── config/                # Security, CORS, OpenAPI Configuration
│   │   ├── controller/            # REST Endpoints
│   │   ├── domain/                # JPA Entities & Enums
│   │   ├── dto/                   # Request/Response DTOs
│   │   ├── exception/             # RFC 7807 Global ProblemDetail Handler
│   │   ├── repository/            # Spring Data Repositories & Locking Queries
│   │   ├── security/              # JWT Filters & UserDetailsService
│   │   └── service/               # Posting Service & Business Logic
│   └── src/main/resources/
│       ├── application.yml        # Production & Dev Configuration (ddl-auto: validate)
│       └── db/migration/          # Flyway SQL Migrations (V1 Schema, V2 Seed)
├── frontend/                      # React 18 + Vite + TypeScript Application
│   ├── src/                       # Living Ledger components & design system
│   ├── package.json
│   └── vite.config.ts
├── docs/                          # Architecture diagrams & walkthroughs
├── scripts/                       # Mutation check and verification scripts
├── docker-compose.yml             # Local PostgreSQL service
├── API.md                         # Detailed API contract & money effects
├── THREATS.md                     # Threat model, race conditions, and mitigations
├── PROMPTS.md                     # Audit log of prompts, mistakes caught, and self-checks
└── README.md                      # Project documentation (updated each commit)
```

---

## 4. Local Setup & Running

### Prerequisites
- Java 21 JDK (Temurin 21 recommended)
- Maven 3.9+
- PostgreSQL 16+ or Docker
- Node.js 18+ and npm

### 1. Database Setup
Start PostgreSQL via Docker Compose:
```bash
docker compose up -d
```
*Alternatively, connect to a local PostgreSQL instance on port `5432` with username `postgres`, password `postgres`, and database `ledgerline`.*

### 2. Run Backend
```bash
cd backend
mvn clean test
mvn spring-boot:run
```
Flyway automatically applies all migrations on startup. Verify the health check:
```bash
curl http://localhost:8080/actuator/health
```
Swagger UI documentation is available at: `http://localhost:8080/swagger-ui.html`.

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

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

**Initial Conservation Equation**:
$$\Sigma \text{ Customer Balances (₹1,500.00)} + \text{System External Balance (-₹1,500.00)} = 0$$

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
- [ ] **Day 1 PM: `feat: ledger core`**
  - [ ] Account and statement endpoints
  - [ ] Double-entry posting service (deposit, withdrawal, transfer)
  - [ ] Ordered pessimistic locking (`SELECT ... FOR UPDATE` in ascending ID order)
  - [ ] Refused-attempt audit logging via `REQUIRES_NEW`
  - [ ] Per-account SHA-256 hash chaining
  - [ ] Service-layer entitlement checks (404 on unentitled accounts)
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
