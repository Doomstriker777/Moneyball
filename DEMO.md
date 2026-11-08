# Moneyball: Live Demonstration Script & Walkthrough

> **Project Target**: Double-Entry Immutable Core Banking Engine  
> **Repository**: [https://github.com/Doomstriker777/Moneyball](https://github.com/Doomstriker777/Moneyball)  
> **UI Aesthetic**: *The Living Ledger* (Editorial Serif, Tabular Monospace, Tactile Paper & Ink)

---

## Quick Reference: Demo Credentials

| Role | Email | Password | Entitled Account | Available Actions |
|---|---|---|---|---|
| **ADMIN** | `admin@ledgerline.internal` | `Admin123!` | All Accounts | Reversals, Account Freeze/Unfreeze, Overdraft limits, AML Flag review |
| **HOLDER 1** | `holder1@ledgerline.internal` | `Holder123!` | `ACC-100001` (Alice) | Transfers, Deposits, Withdrawals, Statement |
| **HOLDER 2** | `holder2@ledgerline.internal` | `Holder222!` | `ACC-100002` (Bob) | Transfers, Deposits, Withdrawals, Statement |
| **AUDITOR** | `auditor@ledgerline.internal` | `Auditor123!` | All (Read-Only) | Verification, Proof Panel, Download Complete Audit Pack |

---

## 5-Minute Video / Live Walkthrough Script

### Act 1: The Core Banking Problem & Architectural Invariants (0:00 – 0:45)
- **Voiceover**:
  > *"Most financial applications fail at the edges: floating-point IEEE-754 rounding drift, check-then-act race conditions that allow double-spending, and silent rollbacks that wipe out the audit trail of failed attacks.  
  > Welcome to **Moneyball** (The Living Ledger) — a zero-floating-point, immutable, double-entry core banking engine engineered with mathematical precision in Spring Boot 3, Java 21, PostgreSQL 17, and React 18."*
- **Visual**:
  - Show the clean browser window at `http://localhost:5173` (or deployed site).
  - Point to the sticky header badge: `● Σ ALL BALANCES = 0`.
  - Explain the paper-and-ink editorial styling (*Fraunces* serif, *IBM Plex Mono*, ruled ledger lines).

---

### Act 2: Role Switcher & Account Odometers (0:45 – 1:30)
- **Actions**:
  1. Click **HOLDER 1** on the 1-Click Role Switcher in the top header.
  2. Notice the instant JWT authentication as `holder1@ledgerline.internal`.
  3. Point to Alice's account card (`ACC-100001`): current balance ₹1,000.00.
  4. Point to the balance display: built using Framer Motion vertical digit rolling odometers.
- **Voiceover**:
  > *"Every account balance in Moneyball is stored strictly as integer paise (`BIGINT`). We never use float or double. The UI renders rupees for readability, but every mathematical calculation and database transaction operates on atomic, discrete paise."*

---

### Act 3: Double-Entry Money Movements & Invariant Conservation (1:30 – 2:30)
- **Actions**:
  1. On `ACC-100001`, click **Transfer**.
  2. Select Destination: `ACC-100002` (Bob).
  3. Enter Amount: `₹150.00` (auto-calculated as 15,000 paise).
  4. Point to the pre-generated UUID in the `Idempotency-Key` field.
  5. Click **Execute Transfer**.
  6. Watch the green tactile rubber stamp slam down: `[POSTED]`.
  7. Observe Alice's balance odometer smoothly roll down from `₹1,000.00` to `₹850.00`.
  8. Click **View Statement**:
     - Point out the newly posted transfer row with running balance ₹850.00 and counterparty `ACC-100002`.
  9. Click **HOLDER 2** on the role switcher:
     - Bob's balance odometer immediately reflects `₹650.00` (+₹150.00 credited).
- **Voiceover**:
  > *"Notice the double-entry accounting in action: Alice's account is debited by 15,000 paise, Bob's is credited by 15,000 paise. Across the entire bank, not a single paisa is created or lost. To prevent deadlocks, row locks are acquired in strictly sorted ascending ID order (`min(src, dst)` then `max(src, dst)`)."*

---

### Act 4: The Adversarial Attack Lab (2:30 – 3:45)
- **Actions**:
  1. In the header navigation strip, click **⚡ Attack Lab**.
  2. **Scenario 1 (Concurrency Race Attack)**:
     - Click **Launch Race Attack (20x)**.
     - 20 parallel threads concurrently attempt ₹60.00 withdrawals against Alice's balance.
     - Watch the live execution terminal stream results:
       - Exactly 1 thread succeeds (`[POSTED] 200 OK`). Balance drops to ₹40.00.
       - 19 threads are immediately rejected with `422 Unprocessable Entity` (`[REFUSED] INSUFFICIENT_FUNDS`).
       - Outcome stamp slams down: `1 POSTED`, `19 BLOCKED`.
  3. **Scenario 2 (Idempotency Replay Attack)**:
     - Click **Launch Replay Attack (10x)**.
     - 10 simultaneous threads send requests with the exact same `Idempotency-Key`.
     - Watch the live terminal:
       - The first thread acquires the atomic lock and posts the journal.
       - The subsequent 9 threads detect the completed key and replay the identical cached response (`[REPLAYED] 200 OK`) without double-charging.
  4. **Scenario 3 (Overdraft Exploit)**:
     - Click **Launch Overdraft Attack** (attempts a ₹1,000,000 breach against a ₹0 limit).
     - Instantly rejected and logged to `ledger_attempts` in a `REQUIRES_NEW` transaction that survives rollback.
- **Voiceover**:
  > *"Here in the Attack Lab, we put the core engine under real multi-threaded adversarial stress. The pessimistic database lock serializes execution without race conditions. And our idempotency engine prevents duplicate billing even when client networks retry concurrently."*

---

### Act 5: Proof Panel & Cryptographic SHA-256 Chains (3:45 – 4:30)
- **Actions**:
  1. Click **Proof & Invariants** in the navigation bar.
  2. View the fundamental equation breakdown:
     - Customer Balances (`+₹X.XX`) + External System Reserve (`-₹X.XX`) = System Net Balance `₹0.00`.
  3. Click **↻ Reconcile Balances**:
     - Real-time full-system scan recomputes every balance from raw ledger legs. Status confirms `0.00 DISCREPANCY`.
  4. Click **⚡ Verify Hash Chains**:
     - SHA-256 traversal checks link continuity from genesis to tip for every account.
     - A green rubber stamp slams down: `[VERIFIED]` (0 broken links).
- **Voiceover**:
  > *"Every entry is cryptographically linked to the prior entry using SHA-256: `hash = SHA-256(priorHash || accountId || seq || kind || amount || direction || timestamp)`. If a database administrator were to secretly modify even a single amount or timestamp in the database, the hash chain breaks immediately, alerting auditors."*

---

### Act 6: Auditor Mode & Admin Compliance Console (4:30 – 5:15)
- **Actions**:
  1. Click **AUDITOR** on the role switcher:
     - The amber **Auditor Inspection Mode** banner appears with read-only guarantees (all write buttons are locked; any API mutation returns HTTP 403).
     - Click **Download Complete Audit Pack (.json)**. Show the downloaded JSON bundle containing all immutable entries, attempts, flags, and offline verification instructions.
  2. Click **ADMIN** on the role switcher:
     - Navigate to **Admin & Compliance** tab.
     - Show the **Account Management** table: toggle Freeze/Unfreeze on any account.
     - Show the **AML Flags Queue**: review a flagged anomaly with an auditor note.
     - Show the **Immutable Reversal Console**: post an equal-and-opposite corrective journal with unique reversal constraints (`UNIQUE(reversal_of)`).
- **Voiceover**:
  > *"Auditors get complete, verifiable transparency without mutation rights. Administrators can freeze compromised accounts and issue immutable corrective reversals without ever altering past ledger entries."*

---

### Act 7: Summary & Conclusion (5:15 – 5:30)
- **Voiceover**:
  > *"Moneyball proves that banking software can be physically provable, mathematically sound, and beautiful to use. All 21 integration tests pass, mutation tests caught 100% of injected faults, and the code is structured in 6 clean Conventional Commits on GitHub. Thank you."*

---

## Local Verification Commands

```bash
# 1. Run all backend tests (21 tests, 0 failures)
mvn -f backend/pom.xml test

# 2. Run automated mutation checks
./scripts/mutation-check.sh

# 3. Build production frontend (0 TypeScript errors)
npm --prefix frontend run build

# 4. Run entire multi-container stack via Docker
docker compose up --build
```

