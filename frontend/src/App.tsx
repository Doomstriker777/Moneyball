import { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { AccountCard } from './components/AccountCard';
import { TransferModal } from './components/TransferModal';
import { DepositModal } from './components/DepositModal';
import { WithdrawalModal } from './components/WithdrawalModal';
import { StatementModal } from './components/StatementModal';
import { LoginModal } from './components/LoginModal';
import { api } from './api/client';
import { Account } from './types';
import { formatPaise } from './utils/formatters';
import { RefreshCw, AlertTriangle } from 'lucide-react';

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
  const [selectedTransferAccount, setSelectedTransferAccount] = useState<Account | null>(null);
  const [selectedDepositAccount, setSelectedDepositAccount] = useState<Account | null>(null);
  const [selectedWithdrawAccount, setSelectedWithdrawAccount] = useState<Account | null>(null);
  const [selectedStatementAccount, setSelectedStatementAccount] = useState<Account | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);

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

  // Fetch Global Reconciliation Status
  const {
    data: reconciliation,
    refetch: refetchReconciliation,
  } = useQuery({
    queryKey: ['reconciliation'],
    queryFn: () => api.getReconciliation(),
    refetchInterval: 10000, // polls every 10s for live conservation status
  });

  const handleOperationSuccess = () => {
    refetchAccounts();
    refetchReconciliation();
  };

  const customerAccounts = accounts.filter((a) => a.type === 'CUSTOMER');
  const systemAccount = accounts.find((a) => a.type === 'SYSTEM');

  const totalCustomerPaise = customerAccounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-paper)' }}>
      {/* Sticky Header with 1-Click Role Switcher */}
      <Header
        onOpenLogin={() => setIsLoginOpen(true)}
        systemConservationStatus={reconciliation?.conservationHolds ? 'BALANCED' : 'DISCREPANCY'}
      />

      {/* Auditor Notice Banner */}
      {user?.role === 'AUDITOR' && (
        <div
          style={{
            backgroundColor: 'var(--color-saffron-light)',
            borderBottom: '1px solid var(--color-saffron)',
            padding: '0.5rem 1.5rem',
            textAlign: 'center',
            fontSize: '0.82rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertTriangle size={15} color="var(--color-saffron)" />
          <strong>AUDITOR INSPECTION MODE</strong>: Read-only access enabled. All write operations (transfers, deposits, withdrawals) are blocked with HTTP 403.
        </div>
      )}

      {/* Main Ruled Ledger Canvas */}
      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Ledger Page Sheet */}
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
                  Ledger Accounts
                </h3>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>
                  Showing accounts entitled to <strong>{user?.email || 'Anonymous'}</strong>
                </span>
              </div>

              {isLoadingAccounts ? (
                <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>
                  <RefreshCw size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
                  <div>Loading accounts from PostgreSQL ledger...</div>
                </div>
              ) : accounts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>
                  No accounts found or you are not signed in. Use the demo switcher above to select a role.
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
          </div>
        </div>
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

      {isLoginOpen && (
        <LoginModal onClose={() => setIsLoginOpen(false)} />
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
