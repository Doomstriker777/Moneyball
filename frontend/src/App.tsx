import { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header, NavTab } from './components/Header';
import { AccountCard } from './components/AccountCard';
import { TransferModal } from './components/TransferModal';
import { DepositModal } from './components/DepositModal';
import { WithdrawalModal } from './components/WithdrawalModal';
import { StatementModal } from './components/StatementModal';
import { LoginModal } from './components/LoginModal';
import { ProofPanel } from './components/ProofPanel';
import { AdminPanel } from './components/AdminPanel';
import { AttackLab } from './components/AttackLab';
import { api } from './api/client';
import { Account } from './types';
import { formatPaise } from './utils/formatters';
import { RefreshCw, AlertTriangle, Download, Shield } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

function DashboardContent() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isExportingAuditPack, setIsExportingAuditPack] = useState<boolean>(false);
  const [selectedTransferAccount, setSelectedTransferAccount] = useState<Account | null>(null);
  const [selectedDepositAccount, setSelectedDepositAccount] = useState<Account | null>(null);
  const [selectedWithdrawAccount, setSelectedWithdrawAccount] = useState<Account | null>(null);
  const [selectedStatementAccount, setSelectedStatementAccount] = useState<Account | null>(null);
  const [loginModalState, setLoginModalState] = useState<{ isOpen: boolean; initialTab: 'login' | 'register' }>({
    isOpen: false,
    initialTab: 'login',
  });

  // Fetch Accounts
  const {
    data: accounts = [],
    isLoading: isLoadingAccounts,
    refetch: refetchAccounts,
  } = useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: () => api.getAccounts(),
    enabled: !!user,
  });

  const customerAccounts = accounts.filter((a) => a.type === 'CUSTOMER');
  const systemAccount = accounts.find((a) => a.type === 'SYSTEM');
  const primaryAccount = customerAccounts[0];

  // Fetch Customer Account Statement for live in-dashboard transaction log
  const {
    data: statement,
    refetch: refetchStatement,
  } = useQuery({
    queryKey: ['statement', primaryAccount?.id],
    queryFn: () => primaryAccount ? api.getStatement(primaryAccount.id) : null,
    enabled: !!primaryAccount && user?.role === 'HOLDER',
  });

  // Fetch Global Reconciliation Status (strictly for ADMIN)
  const {
    data: reconciliation,
    refetch: refetchReconciliation,
  } = useQuery({
    queryKey: ['reconciliation'],
    queryFn: () => api.getReconciliation(),
    enabled: user?.role === 'ADMIN',
    refetchInterval: 10000,
  });

  const handleOperationSuccess = () => {
    refetchAccounts();
    refetchStatement();
    if (user?.role === 'ADMIN') {
      refetchReconciliation();
    }
  };

  const handleExportAuditPack = async () => {
    try {
      setIsExportingAuditPack(true);
      const pack = await api.exportAuditPack();
      const jsonStr = JSON.stringify(pack, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `moneyball-audit-pack-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export audit pack: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExportingAuditPack(false);
    }
  };

  const totalCustomerPaise = customerAccounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-paper)' }}>
      {/* Sticky Header with Authentication & Tab Nav */}
      <Header
        onOpenLogin={(tab) => setLoginModalState({ isOpen: true, initialTab: tab || 'login' })}
        systemConservationStatus={reconciliation?.conservationHolds ? 'BALANCED' : 'DISCREPANCY'}
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onExportAuditPack={handleExportAuditPack}
        isExportingAuditPack={isExportingAuditPack}
      />

      {/* Auditor Notice Banner */}
      {user?.role === 'AUDITOR' && (
        <div
          style={{
            backgroundColor: 'var(--color-saffron-light)',
            borderBottom: '1px solid var(--color-saffron)',
            padding: '0.6rem 1.5rem',
            textAlign: 'center',
            fontSize: '0.82rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={15} color="var(--color-saffron)" />
            <strong>AUDITOR INSPECTION MODE</strong>: Read-only access enabled. All write operations (transfers, deposits, withdrawals) are blocked with HTTP 403.
          </div>
          <button
            onClick={handleExportAuditPack}
            disabled={isExportingAuditPack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.65rem',
              backgroundColor: 'var(--color-stamp-saffron, #9A5B13)',
              color: '#FFF8EE',
              border: 'none',
              borderRadius: '3px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: isExportingAuditPack ? 'wait' : 'pointer',
            }}
          >
            <Download size={13} />
            {isExportingAuditPack ? 'Generating Pack...' : 'Download Complete Audit Pack (.json)'}
          </button>
        </div>
      )}

      {/* Main Ruled Ledger Canvas */}
      <main style={{ flex: 1, padding: '1.5rem 1rem', maxWidth: '1280px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {currentTab === 'proof' && (user?.role === 'ADMIN' ? <ProofPanel /> : <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>Admin privileges required to inspect system mathematical proofs.</div>)}
        {currentTab === 'admin' && (user?.role === 'ADMIN' ? <AdminPanel /> : <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>Admin privileges required.</div>)}
        {currentTab === 'attack' && (user?.role === 'ADMIN' ? <AttackLab /> : <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>Admin privileges required.</div>)}

        {currentTab === 'dashboard' && (
          <div className="ledger-page" style={{ padding: '2.5rem', borderRadius: '4px' }}>
            <div style={{ marginLeft: '60px' }}>
              {/* Top Sheet Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.25rem', letterSpacing: '-0.02em', color: 'var(--color-ink)', lineHeight: 1.1 }}>
                    The Living Ledger
                  </h2>
                  <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.95rem', marginTop: '0.35rem' }}>
                    Double-entry core banking engine. Strict integer paise math. Zero floating-point drift.
                  </p>
                </div>

                {/* Refresh Button */}
                <button
                  onClick={() => { refetchAccounts(); refetchReconciliation(); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.85rem',
                    backgroundColor: 'var(--color-paper-light)',
                    border: '1px solid rgba(47, 93, 80, 0.3)',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    color: 'var(--color-rule-green)',
                  }}
                >
                  <RefreshCw size={13} /> Refresh Ledger
                </button>
              </div>

              {/* Invariant & Metrics Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1rem',
                  marginBottom: '2rem',
                }}
              >
                {/* Metric 1: Conservation Sum */}
                <div
                  style={{
                    backgroundColor: 'var(--color-paper)',
                    border: '1px solid rgba(47, 93, 80, 0.25)',
                    borderRadius: '4px',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', marginBottom: '0.25rem' }}>
                    Global Conservation Sum
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-rule-green)' }}>
                    ₹0.00
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
                    Σ(Customers + External) ≡ 0
                  </div>
                </div>

                {/* Metric 2: Customer Deposits Total */}
                <div
                  style={{
                    backgroundColor: 'var(--color-paper)',
                    border: '1px solid rgba(47, 93, 80, 0.25)',
                    borderRadius: '4px',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', marginBottom: '0.25rem' }}>
                    Total Customer Balances
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                    {formatPaise(totalCustomerPaise)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
                    {customerAccounts.length} Customer Accounts active
                  </div>
                </div>

                {/* Metric 3: External World Offset */}
                <div
                  style={{
                    backgroundColor: 'var(--color-paper)',
                    border: '1px solid rgba(47, 93, 80, 0.25)',
                    borderRadius: '4px',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', marginBottom: '0.25rem' }}>
                    External System Offset
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-stamp-vermilion)' }}>
                    {formatPaise(systemAccount?.balance ?? -totalCustomerPaise)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
                    EXT-000000 (Simulated Outside World)
                  </div>
                </div>
              </div>

              {/* Account Grid */}
              <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(47, 93, 80, 0.2)', paddingBottom: '0.5rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-rule-green)' }}>
                    {user?.role === 'ADMIN' ? 'System Administration' : 'Ledger Accounts'}
                  </h3>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>
                    {user?.role === 'ADMIN'
                      ? 'System Governance Mode • Administrative Authority'
                      : <>Showing accounts entitled to <strong>{user?.email || 'Anonymous'}</strong></>}
                  </span>
                </div>

                {!user ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '3rem 1.5rem',
                      backgroundColor: '#FAF8F4',
                      border: '1px dashed #D6CEBE',
                      borderRadius: '6px',
                    }}
                  >
                    <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: '#1A1815', margin: '0 0 0.5rem 0' }}>
                      Sign In or Register to Access Ledger
                    </h4>
                    <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.95rem', margin: '0 0 1.5rem 0', fontFamily: 'var(--font-serif)' }}>
                      Create a customer banking account (starts with ₹0.00 balance) or sign in with your email and password.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => setLoginModalState({ isOpen: true, initialTab: 'login' })}
                        style={{
                          padding: '0.55rem 1.25rem',
                          backgroundColor: '#FAF8F4',
                          color: '#1A1815',
                          border: '1px solid #D6CEBE',
                          borderRadius: '4px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => setLoginModalState({ isOpen: true, initialTab: 'register' })}
                        style={{
                          padding: '0.55rem 1.25rem',
                          backgroundColor: 'var(--color-rule-green, #1E4E38)',
                          color: '#FFF8EE',
                          border: 'none',
                          borderRadius: '4px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(30, 78, 56, 0.25)',
                        }}
                      >
                        + Create Account
                      </button>
                    </div>
                  </div>
                ) : user.role === 'ADMIN' ? (
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2D9C8',
                      borderRadius: '6px',
                      padding: '2rem',
                      boxShadow: '0 4px 16px rgba(44, 40, 37, 0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <Shield size={24} color="#1E4E38" />
                      <div>
                        <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: '#1A1815', margin: 0 }}>
                          Administrator Governance Console
                        </h4>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#8C7E6A', margin: '0.2rem 0 0 0' }}>
                          Signed in as <strong>{user.email}</strong> • Role: <strong>ADMIN</strong>
                        </p>
                      </div>
                    </div>
                    <p style={{ fontFamily: 'var(--font-serif)', color: '#5A524A', fontSize: '0.95rem', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
                      Administrator accounts do not maintain retail customer ledger accounts. Use the administrative consoles below to govern system operations, monitor double-entry balance invariants, manage overdraft limits, execute corrective reversals, and review compliance anomaly flags.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                      <div
                        onClick={() => setCurrentTab('admin')}
                        style={{
                          padding: '1.25rem',
                          backgroundColor: '#FAF8F4',
                          border: '1px solid #D6CEBE',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s ease',
                        }}
                      >
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textTransform: 'uppercase', color: '#9A5B13', fontWeight: 700, marginBottom: '0.35rem' }}>
                          Management & Audit
                        </div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 700, color: '#1A1815', marginBottom: '0.25rem' }}>
                          Admin & Compliance Panel
                        </div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '0.85rem', color: '#5A524A' }}>
                          Freeze/unfreeze accounts, adjust overdraft limits, issue double-entry reversals, and view full system audit ledger.
                        </div>
                      </div>

                      <div
                        onClick={() => setCurrentTab('proof')}
                        style={{
                          padding: '1.25rem',
                          backgroundColor: '#FAF8F4',
                          border: '1px solid #D6CEBE',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s ease',
                        }}
                      >
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textTransform: 'uppercase', color: '#1E4E38', fontWeight: 700, marginBottom: '0.35rem' }}>
                          Mathematical Verification
                        </div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 700, color: '#1A1815', marginBottom: '0.25rem' }}>
                          Proof & Invariants
                        </div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '0.85rem', color: '#5A524A' }}>
                          Inspect per-account SHA-256 hash chains, verify zero-drift ledger integrity, and assert double-entry balance.
                        </div>
                      </div>

                      <div
                        onClick={() => setCurrentTab('attack')}
                        style={{
                          padding: '1.25rem',
                          backgroundColor: '#FAF8F4',
                          border: '1px solid #D6CEBE',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s ease',
                        }}
                      >
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textTransform: 'uppercase', color: '#B33927', fontWeight: 700, marginBottom: '0.35rem' }}>
                          Adversarial Verification
                        </div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 700, color: '#1A1815', marginBottom: '0.25rem' }}>
                          Security Stress Lab
                        </div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '0.85rem', color: '#5A524A' }}>
                          Simulate high-concurrency race conditions, overdraw attacks, and test strict serializability.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : isLoadingAccounts ? (
                  <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>
                    <RefreshCw size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
                    <div>Loading accounts from PostgreSQL ledger...</div>
                  </div>
                ) : accounts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>
                    No accounts found for {user.email}.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                      gap: '1.5rem',
                    }}
                  >
                    {accounts.map((account) => (
                      <AccountCard
                        key={account.id}
                        account={account}
                        onTransfer={(acc) => setSelectedTransferAccount(acc)}
                        onDeposit={(acc) => setSelectedDepositAccount(acc)}
                        onWithdraw={(acc) => setSelectedWithdrawAccount(acc)}
                        onViewStatement={(acc) => setSelectedStatementAccount(acc)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Account Transaction Activity Feed */}
              {user?.role === 'HOLDER' && statement && (
                <div style={{
                  marginTop: '2.5rem',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2D9C8',
                  borderRadius: '6px',
                  padding: '1.75rem',
                  boxShadow: '0 4px 16px rgba(44, 40, 37, 0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px dashed #E2D9C8', paddingBottom: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', margin: 0, color: 'var(--color-rule-green, #1E4E38)' }}>
                        Account Transaction Activity ({statement.accountNumber})
                      </h3>
                      <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0', fontFamily: 'var(--font-serif)' }}>
                        Live chronological statement of all posted entries and attempted operations for your account.
                      </p>
                    </div>
                    <button
                      onClick={() => refetchStatement()}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        backgroundColor: '#FAF8F4',
                        border: '1px solid #D6CEBE',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      ↻ Refresh Activity
                    </button>
                  </div>

                  {statement.items.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>
                      No transactions recorded yet for this account. Make a deposit or transfer above to get started.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #E2D9C8', textAlign: 'left', color: 'var(--color-ink-muted)' }}>
                            <th style={{ padding: '0.6rem 0.5rem' }}>Date & Time</th>
                            <th style={{ padding: '0.6rem 0.5rem' }}>Type</th>
                            <th style={{ padding: '0.6rem 0.5rem' }}>Description / Reason</th>
                            <th style={{ padding: '0.6rem 0.5rem' }}>Counterparty</th>
                            <th style={{ padding: '0.6rem 0.5rem' }}>Amount</th>
                            <th style={{ padding: '0.6rem 0.5rem' }}>Running Balance</th>
                            <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statement.items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #FAF0E4' }}>
                              <td style={{ padding: '0.6rem 0.5rem', whiteSpace: 'nowrap', color: '#5A524A' }}>
                                {new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                              </td>
                              <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>
                                <span style={{
                                  fontSize: '0.68rem',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '3px',
                                  backgroundColor: '#2C2825',
                                  color: '#FFF8EE'
                                }}>
                                  {item.kind}
                                </span>
                              </td>
                              <td style={{ padding: '0.6rem 0.5rem', color: '#1A1815' }}>
                                {item.reason || 'Account Transaction'}
                              </td>
                              <td style={{ padding: '0.6rem 0.5rem', color: '#8C7E6A' }}>
                                {item.counterpartyAccountNumber || '---'}
                              </td>
                              <td style={{
                                padding: '0.6rem 0.5rem',
                                fontWeight: 700,
                                color: item.direction === 'CREDIT' ? '#1E4E38' : item.direction === 'DEBIT' ? '#B33927' : '#8C7E6A'
                              }}>
                                {item.direction === 'CREDIT' ? '+' : item.direction === 'DEBIT' ? '-' : ''}
                                {formatPaise(item.amount)}
                              </td>
                              <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600, color: '#5A524A' }}>
                                {item.runningBalance !== undefined ? formatPaise(item.runningBalance) : '---'}
                              </td>
                              <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '3px',
                                  backgroundColor:
                                    item.statusOrOutcome === 'POSTED' ? 'rgba(30, 78, 56, 0.1)' :
                                    item.statusOrOutcome === 'REFUSED' ? 'rgba(179, 57, 39, 0.1)' : 'rgba(74, 85, 104, 0.1)',
                                  color:
                                    item.statusOrOutcome === 'POSTED' ? '#1E4E38' :
                                    item.statusOrOutcome === 'REFUSED' ? '#B33927' : '#4A5568',
                                  border: `1px solid ${
                                    item.statusOrOutcome === 'POSTED' ? 'rgba(30, 78, 56, 0.3)' :
                                    item.statusOrOutcome === 'REFUSED' ? 'rgba(179, 57, 39, 0.3)' : 'rgba(74, 85, 104, 0.3)'
                                  }`
                                }}>
                                  {item.statusOrOutcome}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedTransferAccount && (
        <TransferModal
          sourceAccount={selectedTransferAccount}
          allAccounts={accounts}
          onClose={() => setSelectedTransferAccount(null)}
          onSuccess={handleOperationSuccess}
        />
      )}

      {selectedDepositAccount && (
        <DepositModal
          account={selectedDepositAccount}
          onClose={() => setSelectedDepositAccount(null)}
          onSuccess={handleOperationSuccess}
        />
      )}

      {selectedWithdrawAccount && (
        <WithdrawalModal
          account={selectedWithdrawAccount}
          onClose={() => setSelectedWithdrawAccount(null)}
          onSuccess={handleOperationSuccess}
        />
      )}

      {selectedStatementAccount && (
        <StatementModal
          account={selectedStatementAccount}
          onClose={() => setSelectedStatementAccount(null)}
        />
      )}

      {loginModalState.isOpen && (
        <LoginModal
          initialTab={loginModalState.initialTab}
          onClose={() => setLoginModalState({ isOpen: false, initialTab: 'login' })}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DashboardContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}
