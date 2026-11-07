import React, { useEffect, useState } from 'react';
import { Account, StatementResponse } from '../types';
import { api } from '../api/client';
import { formatPaise, formatTimestamp } from '../utils/formatters';
import { RubberStamp } from './RubberStamp';
import { X, RefreshCw, FileText } from 'lucide-react';

interface StatementModalProps {
  account: Account;
  onClose: () => void;
}

export const StatementModal: React.FC<StatementModalProps> = ({ account, onClose }) => {
  const [statement, setStatement] = useState<StatementResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatement = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getStatement(account.id);
      setStatement(data);
    } catch (err: any) {
      setError(err.detail || err.message || 'Failed to fetch statement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement();
  }, [account.id]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(20, 17, 15, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '1.5rem',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className="ledger-page"
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          backgroundColor: 'var(--color-paper-light)',
          borderRadius: '6px',
          boxShadow: 'var(--shadow-ledger)',
          border: '1px solid var(--color-rule-green)',
          position: 'relative',
          padding: '2.5rem',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-ink-muted)',
          }}
        >
          <X size={20} />
        </button>

        {/* Statement Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '2px solid var(--color-rule-green)', paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} color="var(--color-rule-green)" />
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--color-ink)' }}>
                Account Statement
              </h2>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--color-ink-muted)', marginTop: '0.2rem' }}>
              Account Number: <strong>{account.number}</strong> (ID #{account.id})
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>
              Current Cached Balance
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-rule-green)' }}>
              {formatPaise(account.balance)}
            </div>
          </div>
        </div>

        {/* Scrollable Ruled Ledger Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
              <RefreshCw size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
              <div>Fetching chronological ledger entries...</div>
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-stamp-vermilion)', backgroundColor: 'var(--color-stamp-vermilion-light)' }}>
              {error}
            </div>
          ) : statement && statement.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>
              No ledger activity recorded on this account yet.
            </div>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.85rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid rgba(47, 93, 80, 0.3)',
                    textAlign: 'left',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    color: 'var(--color-ink-muted)',
                  }}
                >
                  <th style={{ padding: '0.5rem' }}>Timestamp</th>
                  <th style={{ padding: '0.5rem' }}>Operation</th>
                  <th style={{ padding: '0.5rem' }}>Status</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Debit (-)</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Credit (+)</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {statement?.items.map((item, idx) => {
                  const isDebit = item.direction === 'DEBIT';
                  const isCredit = item.direction === 'CREDIT';
                  const isRefused = item.statusOrOutcome === 'REFUSED';

                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(47, 93, 80, 0.02)',
                        opacity: isRefused ? 0.75 : 1,
                      }}
                    >
                      <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                        {formatTimestamp(item.timestamp)}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>{item.kind}</div>
                        {item.reason && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                            {item.reason}
                          </div>
                        )}
                        {item.counterpartyAccountNumber && (
                          <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-rule-green)' }}>
                            Counterparty: {item.counterpartyAccountNumber}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        <RubberStamp outcome={item.statusOrOutcome} size="sm" />
                      </td>
                      <td
                        style={{
                          padding: '0.65rem 0.5rem',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          color: isDebit ? 'var(--color-stamp-vermilion)' : 'transparent',
                        }}
                      >
                        {isDebit ? formatPaise(item.amount) : '—'}
                      </td>
                      <td
                        style={{
                          padding: '0.65rem 0.5rem',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          color: isCredit ? 'var(--color-rule-green)' : 'transparent',
                          fontWeight: isCredit ? 600 : 400,
                        }}
                      >
                        {isCredit ? formatPaise(item.amount) : '—'}
                      </td>
                      <td
                        style={{
                          padding: '0.65rem 0.5rem',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: item.runningBalance !== undefined ? 'var(--color-ink)' : 'var(--color-ink-muted)',
                        }}
                      >
                        {item.runningBalance !== undefined ? formatPaise(item.runningBalance) : '— (Rolled back)'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
