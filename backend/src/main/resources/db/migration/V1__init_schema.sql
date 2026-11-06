-- V1__init_schema.sql: Core double-entry schema, constraints, append-only triggers, and deferred balance verification

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Users & Roles
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'HOLDER', 'AUDITOR')),
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- 2. Accounts
CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    number VARCHAR(32) NOT NULL UNIQUE,
    owner_id BIGINT NOT NULL REFERENCES users(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('CUSTOMER', 'SYSTEM')),
    balance BIGINT NOT NULL DEFAULT 0,
    overdraft_limit BIGINT NOT NULL DEFAULT 0 CHECK (overdraft_limit >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FROZEN', 'CLOSED')),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_customer_overdraw CHECK (type = 'SYSTEM' OR balance >= -overdraft_limit)
);

CREATE INDEX idx_accounts_owner ON accounts(owner_id);
CREATE INDEX idx_accounts_number ON accounts(number);

-- 3. Account Members (Entitlement mapping)
CREATE TABLE account_members (
    user_id BIGINT NOT NULL REFERENCES users(id),
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    PRIMARY KEY (user_id, account_id)
);

-- 4. Journals (Double-entry transaction headers)
CREATE TABLE journals (
    id BIGSERIAL PRIMARY KEY,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'REVERSAL')),
    initiated_by BIGINT NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    reversal_of BIGINT UNIQUE NULL REFERENCES journals(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_journals_created ON journals(created_at);

-- 5. Ledger Entries (Double-entry line items)
CREATE TABLE ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    journal_id BIGINT NOT NULL REFERENCES journals(id),
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
    amount BIGINT NOT NULL CHECK (amount > 0),
    balance_after BIGINT NOT NULL,
    prev_hash VARCHAR(64) NULL,
    hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ledger_entries_account ON ledger_entries(account_id, id);
CREATE INDEX idx_ledger_entries_journal ON ledger_entries(journal_id);

-- 6. Idempotency Keys
CREATE TABLE idempotency_keys (
    user_id BIGINT NOT NULL REFERENCES users(id),
    key VARCHAR(128) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
    response_status INT NULL,
    response_body TEXT NULL,
    journal_id BIGINT NULL REFERENCES journals(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, key)
);

-- 7. Ledger Attempts (Survives rollbacks; records posted, refused, and replayed requests)
CREATE TABLE ledger_attempts (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NULL REFERENCES accounts(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'REVERSAL')),
    amount BIGINT NOT NULL,
    outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('POSTED', 'REFUSED', 'REPLAYED')),
    reason TEXT NOT NULL,
    journal_id BIGINT NULL REFERENCES journals(id),
    idempotency_key VARCHAR(128) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ledger_attempts_account ON ledger_attempts(account_id, created_at);
CREATE INDEX idx_ledger_attempts_user ON ledger_attempts(user_id, created_at);

-- 8. Flags (Rule-based anomaly detection)
CREATE TABLE flags (
    id BIGSERIAL PRIMARY KEY,
    journal_id BIGINT NULL REFERENCES journals(id),
    attempt_id BIGINT NULL REFERENCES ledger_attempts(id),
    rule VARCHAR(64) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'REVIEWED')),
    reviewed_by BIGINT NULL REFERENCES users(id),
    note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Append-Only Immutability Triggers
CREATE OR REPLACE FUNCTION prevent_modification() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Table % is strictly append-only. UPDATE, DELETE, and TRUNCATE are prohibited.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_immutable_journals
BEFORE UPDATE OR DELETE ON journals
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER trg_immutable_journals_trunc
BEFORE TRUNCATE ON journals
FOR EACH STATEMENT EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER trg_immutable_ledger_entries
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER trg_immutable_ledger_entries_trunc
BEFORE TRUNCATE ON ledger_entries
FOR EACH STATEMENT EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER trg_immutable_ledger_attempts
BEFORE UPDATE OR DELETE ON ledger_attempts
FOR EACH ROW EXECUTE FUNCTION prevent_modification();

CREATE TRIGGER trg_immutable_ledger_attempts_trunc
BEFORE TRUNCATE ON ledger_attempts
FOR EACH STATEMENT EXECUTE FUNCTION prevent_modification();

-- 10. Deferred Invariant Trigger: SUM(credits) = SUM(debits) per journal at transaction commit
CREATE OR REPLACE FUNCTION check_journal_balanced() RETURNS TRIGGER AS $$
DECLARE
    v_credit_sum BIGINT;
    v_debit_sum BIGINT;
BEGIN
    SELECT
        COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END), 0)
    INTO v_credit_sum, v_debit_sum
    FROM ledger_entries
    WHERE journal_id = NEW.journal_id;

    IF v_credit_sum <> v_debit_sum THEN
        RAISE EXCEPTION 'Double-entry invariant violated for Journal %: credits(%) != debits(%)',
            NEW.journal_id, v_credit_sum, v_debit_sum;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_journal_balanced
AFTER INSERT ON ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION check_journal_balanced();

-- 11. Role separation helper (creates ledger_app role if not existing)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ledger_app') THEN
        CREATE ROLE ledger_app WITH LOGIN PASSWORD 'ledger_app_pass';
    END IF;
END $$;

GRANT SELECT, INSERT ON journals, ledger_entries, ledger_attempts, idempotency_keys, flags TO ledger_app;
GRANT SELECT, INSERT, UPDATE ON accounts, account_members, users TO ledger_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ledger_app;
