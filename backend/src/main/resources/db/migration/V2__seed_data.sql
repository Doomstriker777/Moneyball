-- V2__seed_data.sql: Seed admin, auditor, holders, system account, and balanced initial journals

-- 1. Insert Core Users
INSERT INTO users (id, email, password_hash, role) VALUES
(1, 'system@ledgerline.internal', '$2a$10$Q8jhWUhNzl7xtk2lBAnXLOpUzgxCkmm6csfXD4vOzByb8w2wx43Xa', 'ADMIN'),
(2, 'admin@ledgerline.internal', '$2a$10$qfz134r9RGUc2qJSovvlvuzK7DuidUUouXe71fcwNMVAngRGLDbo.', 'ADMIN'),
(3, 'auditor@ledgerline.internal', '$2a$10$/5nrHcT2PxEjDfX..ybZyO44/SymuIMoo3DgjXAexAFT07KnXBccC', 'AUDITOR'),
(4, 'holder1@ledgerline.internal', '$2a$10$sN3etuCNcjaEgUAR3cQGCODkOL/3d.27.KYiMjsGu9yt6GfE.LhQK', 'HOLDER'),
(5, 'holder2@ledgerline.internal', '$2a$10$r6Luns4HUP3nUcy.qIcQSe7QEQimwU.eWkMTny/Ka8OwZoB8Y.N8y', 'HOLDER');

SELECT setval('users_id_seq', 5);

-- 2. Insert Accounts (1 System Account + 2 Customer Accounts)
-- Notice: Total sum of all accounts = -150000 + 100000 + 50000 = 0. Invariant preserved!
INSERT INTO accounts (id, number, owner_id, type, balance, overdraft_limit, status) VALUES
(1, 'EXT-000000', 1, 'SYSTEM', -150000, 0, 'ACTIVE'),
(2, 'ACC-100001', 4, 'CUSTOMER', 100000, 0, 'ACTIVE'),
(3, 'ACC-100002', 5, 'CUSTOMER', 50000, 0, 'ACTIVE');

SELECT setval('accounts_id_seq', 3);

-- 3. Entitlement: Link Holders to their respective accounts
INSERT INTO account_members (user_id, account_id) VALUES
(4, 2),
(5, 3);

-- 4. Insert Initial Balanced Journals
INSERT INTO journals (id, kind, initiated_by, reason, created_at) VALUES
(1, 'DEPOSIT', 2, 'Initial genesis deposit for Holder 1 (₹1,000.00)', '2026-11-01 00:00:00+00'),
(2, 'DEPOSIT', 2, 'Initial genesis deposit for Holder 2 (₹500.00)', '2026-11-01 00:01:00+00');

SELECT setval('journals_id_seq', 2);

-- 5. Insert Ledger Entries with SHA-256 Hash Chain
-- Chained per account: prev_hash -> hash
-- Entry 1: EXT-000000 DEBIT 100000 (balance: -100000)
-- Entry 2: ACC-100001 CREDIT 100000 (balance: 100000)
-- Entry 3: EXT-000000 DEBIT 50000 (balance: -150000)
-- Entry 4: ACC-100002 CREDIT 50000 (balance: 50000)

DO $$
DECLARE
    h_ext_1 VARCHAR(64);
    h_acc1_1 VARCHAR(64);
    h_ext_2 VARCHAR(64);
    h_acc2_1 VARCHAR(64);
    t1 TIMESTAMPTZ := '2026-11-01 00:00:00+00';
    t2 TIMESTAMPTZ := '2026-11-01 00:01:00+00';
BEGIN
    -- Entry 1 (EXT-000000): prev_hash is NULL
    h_ext_1 := encode(digest('' || 1::text || 1::text || 'DEBIT' || 100000::text || (-100000)::text || to_char(t1, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'), 'sha256'), 'hex');
    INSERT INTO ledger_entries (id, journal_id, account_id, direction, amount, balance_after, prev_hash, hash, created_at)
    VALUES (1, 1, 1, 'DEBIT', 100000, -100000, NULL, h_ext_1, t1);

    -- Entry 2 (ACC-100001): prev_hash is NULL
    h_acc1_1 := encode(digest('' || 2::text || 1::text || 'CREDIT' || 100000::text || 100000::text || to_char(t1, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'), 'sha256'), 'hex');
    INSERT INTO ledger_entries (id, journal_id, account_id, direction, amount, balance_after, prev_hash, hash, created_at)
    VALUES (2, 1, 2, 'CREDIT', 100000, 100000, NULL, h_acc1_1, t1);

    -- Entry 3 (EXT-000000): prev_hash is h_ext_1
    h_ext_2 := encode(digest(h_ext_1 || 1::text || 2::text || 'DEBIT' || 50000::text || (-150000)::text || to_char(t2, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'), 'sha256'), 'hex');
    INSERT INTO ledger_entries (id, journal_id, account_id, direction, amount, balance_after, prev_hash, hash, created_at)
    VALUES (3, 2, 1, 'DEBIT', 50000, -150000, h_ext_1, h_ext_2, t2);

    -- Entry 4 (ACC-100002): prev_hash is NULL
    h_acc2_1 := encode(digest('' || 3::text || 2::text || 'CREDIT' || 50000::text || 50000::text || to_char(t2, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'), 'sha256'), 'hex');
    INSERT INTO ledger_entries (id, journal_id, account_id, direction, amount, balance_after, prev_hash, hash, created_at)
    VALUES (4, 2, 3, 'CREDIT', 50000, 50000, NULL, h_acc2_1, t2);
END $$;

SELECT setval('ledger_entries_id_seq', 4);

