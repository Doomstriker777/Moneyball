-- V2__seed_data.sql: Seed admin, auditor, holders, system account, and clean ledger state (0 initial balance, 0 past transactions)

-- 1. Insert Core Users
INSERT INTO users (id, email, password_hash, role) VALUES
(1, 'system@ledgerline.internal', '$2a$10$Q8jhWUhNzl7xtk2lBAnXLOpUzgxCkmm6csfXD4vOzByb8w2wx43Xa', 'ADMIN'),
(2, 'admin@ledgerline.internal', '$2a$10$qfz134r9RGUc2qJSovvlvuzK7DuidUUouXe71fcwNMVAngRGLDbo.', 'ADMIN'),
(3, 'auditor@ledgerline.internal', '$2a$10$/5nrHcT2PxEjDfX..ybZyO44/SymuIMoo3DgjXAexAFT07KnXBccC', 'AUDITOR'),
(4, 'holder1@ledgerline.internal', '$2a$10$sN3etuCNcjaEgUAR3cQGCODkOL/3d.27.KYiMjsGu9yt6GfE.LhQK', 'HOLDER'),
(5, 'holder2@ledgerline.internal', '$2a$10$r6Luns4HUP3nUcy.qIcQSe7QEQimwU.eWkMTny/Ka8OwZoB8Y.N8y', 'HOLDER');

SELECT setval('users_id_seq', 5);

-- 2. Insert Accounts (1 System Account + 2 Customer Accounts starting at 0 balance)
-- Notice: Total sum of all accounts = 0 + 0 + 0 = 0. Double-entry conservation invariant holds!
INSERT INTO accounts (id, number, owner_id, type, balance, overdraft_limit, status) VALUES
(1, 'EXT-000000', 1, 'SYSTEM', 0, 0, 'ACTIVE'),
(2, 'ACC-100001', 4, 'CUSTOMER', 0, 0, 'ACTIVE'),
(3, 'ACC-100002', 5, 'CUSTOMER', 0, 0, 'ACTIVE');

SELECT setval('accounts_id_seq', 3);

-- 3. Entitlement: Link Holders to their respective accounts
INSERT INTO account_members (user_id, account_id) VALUES
(4, 2),
(5, 3);
