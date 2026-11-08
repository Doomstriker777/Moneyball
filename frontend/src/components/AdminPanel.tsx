import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Account, Flag, PostingResponse, TransactionLogItem } from '../types';
import { RubberStamp } from './RubberStamp';

export const AdminPanel: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [transactions, setTransactions] = useState<TransactionLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reversal Form
  const [reversalJournalId, setReversalJournalId] = useState<string>('');
  const [reversalReason, setReversalReason] = useState<string>('');
  const [reversing, setReversing] = useState<boolean>(false);
  const [reversalResult, setReversalResult] = useState<PostingResponse | null>(null);

  // Review Flag Modal
  const [activeFlag, setActiveFlag] = useState<Flag | null>(null);
  const [reviewNote, setReviewNote] = useState<string>('');
  const [reviewing, setReviewing] = useState<boolean>(false);

  // Edit Overdraft Modal
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [newOverdraftRupees, setNewOverdraftRupees] = useState<string>('');
  const [updatingLimit, setUpdatingLimit] = useState<boolean>(false);

  const formatPaise = (paise: number) => {
    return `₹${(paise / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [accs, flgs, txs] = await Promise.all([
        api.getAccounts(),
        api.getFlags(),
        api.getAllTransactions()
      ]);
      setAccounts(accs);
      setFlags(flgs);
      setTransactions(txs);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleFreeze = async (acc: Account) => {
    const nextStatus = acc.status === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
    try {
      setError(null);
      await api.updateAccountStatus(acc.id, nextStatus);
      setSuccessMsg(`Account ${acc.number} is now ${nextStatus}`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update account status');
    }
  };

  const handleSaveOverdraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    const rupees = parseFloat(newOverdraftRupees);
    if (isNaN(rupees) || rupees < 0) {
      setError('Invalid overdraft amount');
      return;
    }
    const paise = Math.round(rupees * 100);
    try {
      setUpdatingLimit(true);
      setError(null);
      await api.updateOverdraftLimit(editingAccount.id, paise);
      setSuccessMsg(`Overdraft limit for ${editingAccount.number} updated to ₹${rupees}`);
      setEditingAccount(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update overdraft limit');
    } finally {
      setUpdatingLimit(false);
    }
  };

  const handleReviewFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFlag || !reviewNote.trim()) return;
    try {
      setReviewing(true);
      setError(null);
      await api.reviewFlag(activeFlag.id, { note: reviewNote.trim() });
      setSuccessMsg(`Flag #${activeFlag.id} reviewed and transitioned to REVIEWED`);
      setActiveFlag(null);
      setReviewNote('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit flag review');
    } finally {
      setReviewing(false);
    }
  };

  const handleReverseJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    const jId = parseInt(reversalJournalId.trim(), 10);
    if (isNaN(jId) || !reversalReason.trim()) {
      setError('Please provide a valid Journal ID and reason');
      return;
    }
    try {
      setReversing(true);
      setError(null);
      setReversalResult(null);
      const res = await api.reverseJournal(jId, { reason: reversalReason.trim() });
      setReversalResult(res);
      setSuccessMsg(`Reversal Journal #${res.journalId} successfully posted.`);
      setReversalJournalId('');
      setReversalReason('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to post reversal journal');
    } finally {
      setReversing(false);
    }
  };

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Title */}
      <div style={{ marginBottom: '2rem', borderBottom: '2px solid #E2D9C8', paddingBottom: '1rem' }}>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.75rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#8C7E6A',
          display: 'block',
          marginBottom: '0.25rem'
        }}>
          RESTRICTED TO BANK ADMINISTRATORS
        </span>
        <h1 style={{
          fontFamily: "'Fraunces', serif",
          fontSize: '2.25rem',
          fontWeight: 700,
          color: '#1A1815',
          margin: 0
        }}>
          Control & Compliance Console
        </h1>
      </div>

      {/* Notifications */}
      {loading && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', color: '#8C7E6A', marginBottom: '1rem' }}>
          Refreshing administrative data from PostgreSQL ledger...
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: 'rgba(179, 57, 39, 0.1)',
          borderLeft: '4px solid #B33927',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1.5rem',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.875rem',
          color: '#B33927'
        }}>
          <strong>Admin Error:</strong> {error}
        </div>
      )}

      {successMsg && (
        <div style={{
          backgroundColor: 'rgba(30, 78, 56, 0.1)',
          borderLeft: '4px solid #1E4E38',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1.5rem',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.875rem',
          color: '#1E4E38'
        }}>
          {successMsg}
        </div>
      )}

      {/* Reversal Section */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2D9C8',
        boxShadow: '0 4px 16px rgba(44, 40, 37, 0.05)',
        borderRadius: '6px',
        padding: '1.75rem',
        marginBottom: '2.5rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px dashed #E2D9C8',
          paddingBottom: '1rem',
          marginBottom: '1.25rem'
        }}>
          <div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.35rem', margin: 0, color: '#1A1815' }}>
              Immutable Journal Reversal
            </h2>
            <p style={{ fontFamily: "'Newsreader', serif", fontSize: '0.95rem', color: '#5A524A', margin: '0.35rem 0 0 0' }}>
              Past journals cannot be edited or deleted. An administrator issues an equal-and-opposite corrective journal with strict two-phase locking.
            </p>
          </div>
          {reversalResult && (
            <RubberStamp
              outcome="REVERSED"
              timestamp={new Date(reversalResult.createdAt).toLocaleTimeString()}
              referenceId={`Rev J#${reversalResult.journalId}`}
              reason={reversalResult.message}
              size="sm"
            />
          )}
        </div>

        <form onSubmit={handleReverseJournal} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#5A524A', marginBottom: '0.35rem' }}>
              TARGET JOURNAL ID
            </label>
            <input
              type="number"
              placeholder="e.g. 4"
              value={reversalJournalId}
              onChange={(e) => setReversalJournalId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                border: '1px solid #D6CEBE',
                borderRadius: '4px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.9rem',
                backgroundColor: '#FAF8F4'
              }}
            />
          </div>

          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#5A524A', marginBottom: '0.35rem' }}>
              JUSTIFICATION / REASON FOR CORRECTION
            </label>
            <input
              type="text"
              placeholder="e.g. Accidental duplicate charge confirmed by customer"
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                border: '1px solid #D6CEBE',
                borderRadius: '4px',
                fontFamily: "'Newsreader', serif",
                fontSize: '0.95rem',
                backgroundColor: '#FAF8F4'
              }}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={reversing}
              style={{
                width: '100%',
                padding: '0.65rem 1rem',
                backgroundColor: '#9A5B13',
                color: '#FFF8EE',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 600,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.85rem',
                cursor: reversing ? 'wait' : 'pointer'
              }}
            >
              {reversing ? 'Posting Reversal...' : 'Post Reversal Journal'}
            </button>
          </div>
        </form>
      </div>

      {/* Account Control Table */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2D9C8',
        boxShadow: '0 4px 16px rgba(44, 40, 37, 0.05)',
        borderRadius: '6px',
        padding: '1.75rem',
        marginBottom: '2.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.35rem', margin: 0, color: '#1A1815' }}>
              Account Administration & Overdraft Limits
            </h2>
            <p style={{ fontFamily: "'Newsreader', serif", fontSize: '0.95rem', color: '#5A524A', margin: '0.25rem 0 0 0' }}>
              Freeze compromised accounts or tune permissible credit limits.
            </p>
          </div>
          <button
            onClick={loadData}
            style={{
              padding: '0.45rem 0.85rem',
              backgroundColor: '#FAF8F4',
              border: '1px solid #D6CEBE',
              borderRadius: '4px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            ↻ Refresh
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2D9C8', textAlign: 'left', color: '#8C7E6A' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>ID</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Number</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Type</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Current Balance</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Overdraft Limit</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc.id} style={{ borderBottom: '1px solid #FAF0E4' }}>
                  <td style={{ padding: '0.75rem 0.5rem', color: '#8C7E6A' }}>#{acc.id}</td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{acc.number}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.2rem 0.45rem',
                      borderRadius: '3px',
                      backgroundColor: acc.type === 'SYSTEM' ? '#2C2825' : '#EAE4D8',
                      color: acc.type === 'SYSTEM' ? '#FFF8EE' : '#2C2825'
                    }}>
                      {acc.type}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: acc.status === 'ACTIVE' ? '#1E4E38' : '#B33927'
                    }}>
                      {acc.status === 'ACTIVE' ? '● ACTIVE' : '■ FROZEN'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                    {formatPaise(acc.balance)}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: acc.overdraftLimit > 0 ? '#9A5B13' : '#8C7E6A' }}>
                    {formatPaise(acc.overdraftLimit)}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                    {acc.type !== 'SYSTEM' && (
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleToggleFreeze(acc)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            border: '1px solid #D6CEBE',
                            borderRadius: '3px',
                            backgroundColor: acc.status === 'ACTIVE' ? '#FFF5F5' : '#E8F5E9',
                            color: acc.status === 'ACTIVE' ? '#B33927' : '#1E4E38',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          {acc.status === 'ACTIVE' ? 'Freeze' : 'Unfreeze'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingAccount(acc);
                            setNewOverdraftRupees((acc.overdraftLimit / 100).toString());
                          }}
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            border: '1px solid #D6CEBE',
                            borderRadius: '3px',
                            backgroundColor: '#FAF8F4',
                            color: '#2C2825',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          Edit Limit
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance & AML Flags */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2D9C8',
        boxShadow: '0 4px 16px rgba(44, 40, 37, 0.05)',
        borderRadius: '6px',
        padding: '1.75rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.35rem', margin: 0, color: '#1A1815' }}>
              AML & Anomaly Flags Queue ({flags.length})
            </h2>
            <p style={{ fontFamily: "'Newsreader', serif", fontSize: '0.95rem', color: '#5A524A', margin: '0.25rem 0 0 0' }}>
              Automated heuristics flagging suspicious velocity, large amounts, structuring, or repeated refusals.
            </p>
          </div>
        </div>

        {flags.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#8C7E6A', fontFamily: "'Newsreader', serif", fontStyle: 'italic' }}>
            No compliance flags triggered. System running in safe parameters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2D9C8', textAlign: 'left', color: '#8C7E6A' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Flag ID</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Rule Triggered</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Severity</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Context</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Review Note</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {flags.map((flg) => (
                  <tr key={flg.id} style={{ borderBottom: '1px solid #FAF0E4' }}>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#8C7E6A' }}>#{flg.id}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{flg.rule}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '3px',
                        fontWeight: 700,
                        backgroundColor:
                          flg.severity === 'CRITICAL' ? '#FFEBEE' :
                          flg.severity === 'HIGH' ? '#FFF3E0' :
                          flg.severity === 'MEDIUM' ? '#FFFDE7' : '#E8F5E9',
                        color:
                          flg.severity === 'CRITICAL' ? '#B33927' :
                          flg.severity === 'HIGH' ? '#D97706' :
                          flg.severity === 'MEDIUM' ? '#9A5B13' : '#1E4E38'
                      }}>
                        {flg.severity}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#5A524A' }}>
                      {flg.journalId ? `Journal #${flg.journalId}` : flg.attemptId ? `Attempt #${flg.attemptId}` : '---'}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{
                        fontWeight: 600,
                        color: flg.status === 'OPEN' ? '#B33927' : '#1E4E38'
                      }}>
                        {flg.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#5A524A' }}>
                      {flg.note || 'Pending review...'}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      {flg.status === 'OPEN' && (
                        <button
                          onClick={() => {
                            setActiveFlag(flg);
                            setReviewNote('');
                          }}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.75rem',
                            backgroundColor: '#2C2825',
                            color: '#FFF8EE',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* System-Wide Transaction Audit Log */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2D9C8',
        boxShadow: '0 4px 16px rgba(44, 40, 37, 0.05)',
        borderRadius: '6px',
        padding: '1.75rem',
        marginTop: '2.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.35rem', margin: 0, color: '#1A1815' }}>
              System-Wide Transaction Audit Ledger ({transactions.length})
            </h2>
            <p style={{ fontFamily: "'Newsreader', serif", fontSize: '0.95rem', color: '#5A524A', margin: '0.25rem 0 0 0' }}>
              Chronological immutable double-entry journal legs across all bank customer and system accounts.
            </p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#8C7E6A', fontFamily: "'Newsreader', serif", fontStyle: 'italic' }}>
            No transaction records found in ledger.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: '480px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.82rem' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#FAF8F4', zIndex: 1 }}>
                <tr style={{ borderBottom: '2px solid #E2D9C8', textAlign: 'left', color: '#8C7E6A' }}>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Journal #</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Timestamp</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Account</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Type</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Direction</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Amount</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Balance After</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Counterparty</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Reason</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.entryId} style={{ borderBottom: '1px solid #FAF0E4' }}>
                    <td style={{ padding: '0.6rem 0.5rem', color: '#8C7E6A' }}>J#{tx.journalId}</td>
                    <td style={{ padding: '0.6rem 0.5rem', whiteSpace: 'nowrap' }}>
                      {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{tx.accountNumber}</td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '3px',
                        backgroundColor: '#2C2825',
                        color: '#FFF8EE',
                        fontWeight: 700
                      }}>
                        {tx.kind}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: tx.direction === 'CREDIT' ? '#1E4E38' : '#B33927'
                      }}>
                        {tx.direction}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem', fontWeight: 700, color: tx.direction === 'CREDIT' ? '#1E4E38' : '#B33927' }}>
                      {tx.direction === 'CREDIT' ? '+' : '-'}{formatPaise(tx.amount)}
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem', color: '#5A524A' }}>
                      {formatPaise(tx.balanceAfter)}
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem', color: '#8C7E6A' }}>
                      {tx.counterpartyAccountNumber || '---'}
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem', color: '#5A524A', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.reason}
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem', color: '#8C7E6A', fontSize: '0.7rem' }}>
                      <code>{tx.hash ? tx.hash.substring(0, 10) + '...' : '---'}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Flag Review Modal Dialog */}
      {activeFlag && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(26, 24, 21, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2D9C8',
            borderRadius: '6px',
            width: '100%',
            maxWidth: '520px',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.4rem', margin: '0 0 0.5rem 0', color: '#1A1815' }}>
              Review Compliance Flag #{activeFlag.id}
            </h3>
            <p style={{ fontFamily: "'Newsreader', serif", color: '#5A524A', margin: '0 0 1.25rem 0', fontSize: '0.95rem' }}>
              Rule: <strong>{activeFlag.rule}</strong> (Severity: {activeFlag.severity})
            </p>

            <form onSubmit={handleReviewFlagSubmit}>
              <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#5A524A', marginBottom: '0.35rem' }}>
                AUDITOR / ADMINISTRATOR NOTE
              </label>
              <textarea
                rows={4}
                required
                placeholder="Explain the review conclusion (e.g. Verified customer KYC documentation; legitimate corporate wire)."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #D6CEBE',
                  borderRadius: '4px',
                  fontFamily: "'Newsreader', serif",
                  fontSize: '0.95rem',
                  backgroundColor: '#FAF8F4',
                  boxSizing: 'border-box',
                  marginBottom: '1.25rem'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveFlag(null)}
                  style={{
                    padding: '0.6rem 1rem',
                    backgroundColor: '#FAF8F4',
                    border: '1px solid #D6CEBE',
                    borderRadius: '4px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewing}
                  style={{
                    padding: '0.6rem 1.25rem',
                    backgroundColor: '#1E4E38',
                    color: '#FFF8EE',
                    border: 'none',
                    borderRadius: '4px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontWeight: 600,
                    cursor: reviewing ? 'wait' : 'pointer'
                  }}
                >
                  {reviewing ? 'Recording Review...' : 'Approve & Dismiss Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Overdraft Modal */}
      {editingAccount && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(26, 24, 21, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2D9C8',
            borderRadius: '6px',
            width: '100%',
            maxWidth: '460px',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.4rem', margin: '0 0 0.5rem 0', color: '#1A1815' }}>
              Adjust Overdraft Limit
            </h3>
            <p style={{ fontFamily: "'Newsreader', serif", color: '#5A524A', margin: '0 0 1.25rem 0', fontSize: '0.95rem' }}>
              Account: <strong>{editingAccount.number}</strong> (Current balance: {formatPaise(editingAccount.balance)})
            </p>

            <form onSubmit={handleSaveOverdraft}>
              <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#5A524A', marginBottom: '0.35rem' }}>
                OVERDRAFT LIMIT (IN RUPEES)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={newOverdraftRupees}
                onChange={(e) => setNewOverdraftRupees(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #D6CEBE',
                  borderRadius: '4px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '1.1rem',
                  backgroundColor: '#FAF8F4',
                  boxSizing: 'border-box',
                  marginBottom: '1.25rem'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  style={{
                    padding: '0.6rem 1rem',
                    backgroundColor: '#FAF8F4',
                    border: '1px solid #D6CEBE',
                    borderRadius: '4px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingLimit}
                  style={{
                    padding: '0.6rem 1.25rem',
                    backgroundColor: '#1E4E38',
                    color: '#FFF8EE',
                    border: 'none',
                    borderRadius: '4px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontWeight: 600,
                    cursor: updatingLimit ? 'wait' : 'pointer'
                  }}
                >
                  {updatingLimit ? 'Updating...' : 'Save Limit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
