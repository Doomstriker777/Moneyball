import React from 'react';
import { Account } from '../types';
import { formatPaise } from '../utils/formatters';
import { Odometer } from './Odometer';
import { ArrowUpRight, ArrowDownLeft, ShieldAlert, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AccountCardProps {
  account: Account;
  onTransfer: (account: Account) => void;
  onDeposit: (account: Account) => void;
  onWithdraw: (account: Account) => void;
  onViewStatement: (account: Account) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onTransfer,
  onDeposit,
  onWithdraw,
  onViewStatement,
}) => {
  const { user } = useAuth();
  const isSystem = account.type === 'SYSTEM';
  const isFrozen = account.status === 'FROZEN';
  const isAuditor = user?.role === 'AUDITOR';
  const isAdmin = user?.role === 'ADMIN';

  // Can this user initiate money operations from this account?
  const canOperate = !isAuditor && !isFrozen && (isAdmin || account.ownerId === user?.id);

  return (
    <div
      className="ledger-card"
      style={{
        backgroundColor: 'var(--color-paper-light)',
        border: '1px solid rgba(47, 93, 80, 0.25)',
        borderRadius: '6px',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-ledger)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '230px',
      }}
    >
      {/* Top watermark / accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: isSystem ? 'var(--color-ink-muted)' : isFrozen ? 'var(--color-stamp-vermilion)' : 'var(--color-rule-green)',
        }}
      />

      {/* Top Row: Account Number & Status Badges */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: 'var(--color-ink)',
                }}
              >
                {account.number}
              </span>
              {isSystem && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: 'var(--color-paper-dark)',
                    color: 'var(--color-ink-muted)',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '3px',
                    fontWeight: 700,
                  }}
                >
                  SYSTEM (EXTERNAL)
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-ink-muted)',
                marginTop: '0.15rem',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Account ID #{account.id} • {account.type}
            </div>
          </div>

          {/* Status Badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              fontSize: '0.7rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              backgroundColor: isFrozen ? 'var(--color-stamp-vermilion-light)' : 'var(--color-rule-green-light)',
              color: isFrozen ? 'var(--color-stamp-vermilion)' : 'var(--color-rule-green)',
              border: `1px solid ${isFrozen ? 'rgba(179, 57, 39, 0.3)' : 'rgba(30, 78, 56, 0.3)'}`,
            }}
          >
            {isFrozen ? <ShieldAlert size={11} /> : '●'} {account.status}
          </span>
        </div>

        {/* Balance Display with Odometer */}
        <div style={{ margin: '1rem 0' }}>
          <div
            style={{
              fontSize: '0.72rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-ink-muted)',
              fontFamily: 'var(--font-mono)',
              marginBottom: '0.25rem',
            }}
          >
            Ledger Balance
          </div>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              fontFamily: 'var(--font-serif)',
              letterSpacing: '-0.02em',
              color: account.balance < 0 ? 'var(--color-stamp-vermilion)' : 'var(--color-ink)',
            }}
          >
            <Odometer value={account.balance} />
          </div>

          {/* Overdraft limit note */}
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-ink-muted)',
              fontFamily: 'var(--font-mono)',
              marginTop: '0.2rem',
            }}
          >
            Overdraft Limit: <strong>{formatPaise(account.overdraftLimit)}</strong>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          borderTop: '1px dashed rgba(47, 93, 80, 0.2)',
          paddingTop: '0.85rem',
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        {!isSystem && (
          <>
            <button
              onClick={() => onTransfer(account)}
              disabled={!canOperate}
              title={!canOperate ? 'Disabled for your role or account status' : 'Transfer to another account'}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.65rem',
                backgroundColor: canOperate ? 'var(--color-rule-green)' : 'var(--color-paper-dark)',
                color: canOperate ? 'var(--color-paper-light)' : 'var(--color-ink-faint)',
                border: 'none',
                borderRadius: '4px',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: canOperate ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
              }}
            >
              <ArrowLeftRight size={13} />
              Transfer
            </button>

            <button
              onClick={() => onDeposit(account)}
              disabled={isAuditor || isFrozen}
              title="Deposit external simulated funds"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.65rem',
                backgroundColor: !isAuditor && !isFrozen ? 'var(--color-paper)' : 'var(--color-paper-dark)',
                color: !isAuditor && !isFrozen ? 'var(--color-rule-green)' : 'var(--color-ink-faint)',
                border: '1px solid rgba(47, 93, 80, 0.3)',
                borderRadius: '4px',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: !isAuditor && !isFrozen ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
              }}
            >
              <ArrowDownLeft size={13} />
              Deposit
            </button>

            <button
              onClick={() => onWithdraw(account)}
              disabled={!canOperate}
              title="Withdraw funds to outside world"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.65rem',
                backgroundColor: canOperate ? 'var(--color-paper)' : 'var(--color-paper-dark)',
                color: canOperate ? 'var(--color-stamp-vermilion)' : 'var(--color-ink-faint)',
                border: '1px solid rgba(179, 57, 39, 0.3)',
                borderRadius: '4px',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: canOperate ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
              }}
            >
              <ArrowUpRight size={13} />
              Withdraw
            </button>
          </>
        )}

        <button
          onClick={() => onViewStatement(account)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            padding: '0.45rem 0.65rem',
            backgroundColor: 'transparent',
            color: 'var(--color-ink-muted)',
            border: '1px solid rgba(0,0,0,0.15)',
            borderRadius: '4px',
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            fontSize: '0.78rem',
            cursor: 'pointer',
          }}
        >
          Statement
        </button>
      </div>
    </div>
  );
};
