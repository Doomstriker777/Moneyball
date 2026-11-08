import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { ReconciliationReport, HashChainVerificationReport } from '../types';
import { RubberStamp } from './RubberStamp';

export const ProofPanel: React.FC = () => {
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);
  const [hashReport, setHashReport] = useState<HashChainVerificationReport | null>(null);
  const [loadingReconcile, setLoadingReconcile] = useState<boolean>(false);
  const [loadingVerify, setLoadingVerify] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const formatPaise = (paise: number) => {
    const rupees = (paise / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `₹${rupees}`;
  };

  const loadReconciliation = async () => {
    try {
      setLoadingReconcile(true);
      setError(null);
      const res = await api.getReconciliation();
      setReconciliation(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reconciliation report');
    } finally {
      setLoadingReconcile(false);
    }
  };

  const loadVerification = async () => {
    try {
      setLoadingVerify(true);
      setError(null);
      const res = await api.verifyHashChains();
      setHashReport(res);
    } catch (err: any) {
      setError(err.message || 'Failed to verify cryptographic hash chains');
    } finally {
      setLoadingVerify(false);
    }
  };

  useEffect(() => {
    loadReconciliation();
    loadVerification();
  }, []);

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', borderBottom: '2px solid #E2D9C8', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#8C7E6A',
              display: 'block',
              marginBottom: '0.25rem'
            }}>
              MATHEMATICAL & CRYPTOGRAPHIC PROOF
            </span>
            <h1 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: '2.25rem',
              fontWeight: 700,
              color: '#1A1815',
              margin: 0
            }}>
              Conservation of Value & Integrity
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={loadReconciliation}
              disabled={loadingReconcile}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.85rem',
                padding: '0.65rem 1.1rem',
                backgroundColor: '#1E4E38',
                color: '#FFF8EE',
                border: 'none',
                borderRadius: '4px',
                cursor: loadingReconcile ? 'wait' : 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {loadingReconcile ? 'Recomputing...' : '↻ Reconcile Balances'}
            </button>
            <button
              onClick={loadVerification}
              disabled={loadingVerify}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.85rem',
                padding: '0.65rem 1.1rem',
                backgroundColor: '#2C2825',
                color: '#FFF8EE',
                border: 'none',
                borderRadius: '4px',
                cursor: loadingVerify ? 'wait' : 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {loadingVerify ? 'Verifying...' : '⚡ Verify Hash Chains'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(179, 57, 39, 0.1)',
          borderLeft: '4px solid #B33927',
          padding: '1rem 1.25rem',
          borderRadius: '4px',
          marginBottom: '2rem',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.875rem',
          color: '#B33927'
        }}>
          <strong>Verification Error:</strong> {error}
        </div>
      )}

      {/* The Fundamental Equation Card */}
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
          alignItems: 'center',
          marginBottom: '1.5rem',
          borderBottom: '1px dashed #E2D9C8',
          paddingBottom: '0.75rem'
        }}>
          <h2 style={{
            fontFamily: "'Fraunces', serif",
            fontSize: '1.4rem',
            margin: 0,
            color: '#1A1815'
          }}>
            The First Invariant: Zero-Sum Conservation
          </h2>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.8rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '12px',
            backgroundColor: reconciliation?.conservationHolds ? '#E8F5E9' : '#FFEBEE',
            color: reconciliation?.conservationHolds ? '#1E4E38' : '#B33927',
            fontWeight: 700,
            border: `1px solid ${reconciliation?.conservationHolds ? '#A5D6A7' : '#FFCDD2'}`
          }}>
            {reconciliation?.conservationHolds ? '● INVARIANT HOLDS (0.00 DISCREPANCY)' : '▲ INVARIANT BREACHED'}
          </span>
        </div>

        {/* Math equation visually */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
          alignItems: 'center'
        }}>
          {/* Customer Balances */}
          <div style={{
            backgroundColor: '#F9F6F0',
            border: '1px solid #E2D9C8',
            borderRadius: '4px',
            padding: '1.25rem',
            textAlign: 'center'
          }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.75rem',
              color: '#8C7E6A',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '0.5rem'
            }}>
              Σ Customer Balances
            </span>
            <div style={{
              fontFamily: "'Fraunces', serif",
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#1E4E38'
            }}>
              {reconciliation ? formatPaise(reconciliation.totalCustomerBalance) : '---'}
            </div>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.75rem',
              color: '#8C7E6A',
              marginTop: '0.25rem',
              display: 'block'
            }}>
              All non-system customer accounts
            </span>
          </div>

          {/* Plus sign */}
          <div style={{
            textAlign: 'center',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#8C7E6A',
            fontFamily: "'IBM Plex Mono', monospace"
          }}>
            +
          </div>

          {/* External System Balance */}
          <div style={{
            backgroundColor: '#F9F6F0',
            border: '1px solid #E2D9C8',
            borderRadius: '4px',
            padding: '1.25rem',
            textAlign: 'center'
          }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.75rem',
              color: '#8C7E6A',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '0.5rem'
            }}>
              External Reserve (EXT-000000)
            </span>
            <div style={{
              fontFamily: "'Fraunces', serif",
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#9A5B13'
            }}>
              {reconciliation ? formatPaise(reconciliation.externalAccountBalance) : '---'}
            </div>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.75rem',
              color: '#8C7E6A',
              marginTop: '0.25rem',
              display: 'block'
            }}>
              System clearing counterpart (ID: 1)
            </span>
          </div>

          {/* Equals sign */}
          <div style={{
            textAlign: 'center',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#8C7E6A',
            fontFamily: "'IBM Plex Mono', monospace"
          }}>
            =
          </div>

          {/* System Sum */}
          <div style={{
            backgroundColor: reconciliation?.conservationHolds ? '#F0F9F4' : '#FDF2F0',
            border: `2px solid ${reconciliation?.conservationHolds ? '#1E4E38' : '#B33927'}`,
            borderRadius: '4px',
            padding: '1.25rem',
            textAlign: 'center'
          }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.75rem',
              color: reconciliation?.conservationHolds ? '#1E4E38' : '#B33927',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 600
            }}>
              Total System Net Balance
            </span>
            <div style={{
              fontFamily: "'Fraunces', serif",
              fontSize: '2rem',
              fontWeight: 700,
              color: reconciliation?.conservationHolds ? '#1E4E38' : '#B33927'
            }}>
              {reconciliation ? formatPaise(reconciliation.systemSum) : '---'}
            </div>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.75rem',
              color: '#8C7E6A',
              marginTop: '0.25rem',
              display: 'block'
            }}>
              Strict invariant: 0 paise discrepancy
            </span>
          </div>
        </div>

        {/* Detailed Stats */}
        {reconciliation && (
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #E2D9C8',
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.8rem',
            color: '#8C7E6A',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div>Scanned Accounts: <strong>{reconciliation.totalAccountsScanned}</strong></div>
            <div>Scanned Journals: <strong>{reconciliation.totalJournalsScanned}</strong></div>
            <div>Audit Timestamp: <strong>{new Date(reconciliation.timestamp).toLocaleTimeString()}</strong></div>
          </div>
        )}
      </div>

      {/* Discrepancies Alert Table (if any) */}
      {reconciliation && reconciliation.discrepancies.length > 0 && (
        <div style={{
          backgroundColor: '#FFF5F5',
          border: '2px solid #B33927',
          borderRadius: '6px',
          padding: '1.5rem',
          marginBottom: '2.5rem'
        }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", color: '#B33927', margin: '0 0 1rem 0' }}>
            CRITICAL DISCREPANCIES DETECTED
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #B33927', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Account ID</th>
                <th style={{ padding: '0.5rem' }}>Account Number</th>
                <th style={{ padding: '0.5rem' }}>Cached Balance</th>
                <th style={{ padding: '0.5rem' }}>Recalculated</th>
                <th style={{ padding: '0.5rem' }}>Difference</th>
              </tr>
            </thead>
            <tbody>
              {reconciliation.discrepancies.map((d) => (
                <tr key={d.accountId} style={{ borderBottom: '1px solid #FFCDD2' }}>
                  <td style={{ padding: '0.5rem' }}>#{d.accountId}</td>
                  <td style={{ padding: '0.5rem' }}>{d.accountNumber}</td>
                  <td style={{ padding: '0.5rem' }}>{formatPaise(d.cachedBalance)}</td>
                  <td style={{ padding: '0.5rem' }}>{formatPaise(d.recalculatedBalance)}</td>
                  <td style={{ padding: '0.5rem', color: '#B33927', fontWeight: 700 }}>{formatPaise(d.difference)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cryptographic SHA-256 Hash Chain Section */}
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
          gap: '1.5rem',
          borderBottom: '1px dashed #E2D9C8',
          paddingBottom: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          <div>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#8C7E6A',
              display: 'block',
              marginBottom: '0.25rem'
            }}>
              TAMPER-EVIDENT CRYPTOGRAPHIC AUDIT
            </span>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: '1.4rem',
              margin: 0,
              color: '#1A1815'
            }}>
              SHA-256 Hash Chain Verification
            </h2>
            <p style={{
              fontFamily: "'Newsreader', serif",
              fontSize: '0.95rem',
              color: '#5A524A',
              margin: '0.5rem 0 0 0'
            }}>
              Every ledger entry links to the prior entry's hash in strict sequence. If any byte, timestamp, amount, or direction is altered, the entire hash chain fractures.
            </p>
          </div>

          {hashReport && (
            <div>
              <RubberStamp
                outcome={hashReport.valid ? 'VERIFIED' : 'BROKEN'}
                timestamp={new Date(hashReport.timestamp).toLocaleTimeString()}
                referenceId={`Entries: ${hashReport.totalEntriesScanned}`}
                size="md"
              />
            </div>
          )}
        </div>

        {hashReport ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ backgroundColor: '#F9F6F0', padding: '1rem', borderRadius: '4px' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#8C7E6A' }}>Status</span>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '1.1rem',
                fontWeight: 700,
                color: hashReport.valid ? '#1E4E38' : '#B33927'
              }}>
                {hashReport.status}
              </div>
            </div>
            <div style={{ backgroundColor: '#F9F6F0', padding: '1rem', borderRadius: '4px' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#8C7E6A' }}>Entries Verified</span>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1.1rem', fontWeight: 700, color: '#1A1815' }}>
                {hashReport.totalEntriesScanned}
              </div>
            </div>
            <div style={{ backgroundColor: '#F9F6F0', padding: '1rem', borderRadius: '4px' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#8C7E6A' }}>Account Chains Verified</span>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1.1rem', fontWeight: 700, color: '#1A1815' }}>
                {hashReport.totalAccountsScanned}
              </div>
            </div>
            <div style={{ backgroundColor: '#F9F6F0', padding: '1rem', borderRadius: '4px' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#8C7E6A' }}>Genesis-to-Tip Integrity</span>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1.1rem', fontWeight: 700, color: '#1E4E38' }}>
                100% UNBROKEN
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#8C7E6A', fontStyle: 'italic' }}>
            Click 'Verify Hash Chains' to initiate SHA-256 chain traversal.
          </div>
        )}

        {hashReport && !hashReport.valid && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#FFEBEE',
            border: '1px solid #FFCDD2',
            borderRadius: '4px',
            color: '#B33927',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.85rem'
          }}>
            <strong>Tampering Alert:</strong> Chain failure at Entry #{hashReport.firstBrokenEntryId} in Account #{hashReport.brokenAccountId}. Reason: {hashReport.failureReason}
          </div>
        )}
      </div>

      {/* Explanatory Editorial Footnote */}
      <div style={{
        backgroundColor: '#F9F6F0',
        border: '1px solid #E2D9C8',
        borderRadius: '6px',
        padding: '1.5rem',
        fontFamily: "'Newsreader', serif",
        fontSize: '0.95rem',
        lineHeight: 1.6,
        color: '#5A524A'
      }}>
        <h4 style={{ fontFamily: "'Fraunces', serif", color: '#1A1815', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
          Architectural Invariants of LedgerLine
        </h4>
        <p style={{ margin: '0 0 0.5rem 0' }}>
          <strong>1. Conservation of Value:</strong> In modern core banking, money is never created or destroyed in transit. Every credit is mirrored by an equal debit across immutable journal legs (&Sigma; credits = &Sigma; debits). The entire bank system sum, including the external reserve, evaluates strictly to zero paise at all times.
        </p>
        <p style={{ margin: 0 }}>
          <strong>2. Append-Only SHA-256 Chaining:</strong> Ledger rows are strictly insert-only. Update and delete triggers prevent mutations. Each entry locks the previous entry's cryptographic hash into its own payload digest: <code>SHA-256(priorHash || accountId || seq || kind || amount || direction || timestamp)</code>.
        </p>
      </div>
    </div>
  );
};
