import React, { useState, useEffect } from 'react';
import { Account, PostingResponse } from '../types';
import { api, ApiError } from '../api/client';
import { formatPaise, generateIdempotencyKey, rupeesToPaise } from '../utils/formatters';
import { RubberStamp } from './RubberStamp';
import { RefreshCw, X, ArrowRight } from 'lucide-react';

interface TransferModalProps {
  sourceAccount: Account;
  allAccounts: Account[];
  onClose: () => void;
  onSuccess: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  sourceAccount,
  allAccounts,
  onClose,
  onSuccess,
}) => {
  const [destinationId, setDestinationId] = useState<string>('');
  const [customDestinationNumber, setCustomDestinationNumber] = useState<string>('');
  const [isCustomAccount, setIsCustomAccount] = useState<boolean>(false);
  const [rupeesInput, setRupeesInput] = useState<string>('50.00');
  const [reason, setReason] = useState<string>('Settlement payment');
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{
    outcome: 'POSTED' | 'REFUSED' | 'REPLAYED';
    message: string;
    journalId?: number;
    errorDetail?: string;
  } | null>(null);

  // Available destination accounts (exclude source account and system account)
  const candidateAccounts = allAccounts.filter(
    (a) => a.id !== sourceAccount.id && a.type === 'CUSTOMER'
  );

  useEffect(() => {
    setIdempotencyKey(generateIdempotencyKey());
    if (candidateAccounts.length > 0) {
      setDestinationId(candidateAccounts[0].id.toString());
    }
  }, [sourceAccount.id]);

  const paiseAmount = rupeesToPaise(rupeesInput);
  const isOverdraftViolated =
    sourceAccount.balance - paiseAmount < -sourceAccount.overdraftLimit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paiseAmount <= 0) return;

    setIsLoading(true);
    setResult(null);

    try {
      const payload: any = {
        sourceAccountId: sourceAccount.id,
        amount: paiseAmount,
        reason: reason || 'Transfer between accounts',
      };

      if (isCustomAccount) {
        payload.destinationAccountNumber = customDestinationNumber.trim();
      } else {
        payload.destinationAccountId = parseInt(destinationId, 10);
      }

      const response: PostingResponse = await api.transfer(payload, idempotencyKey);

      setResult({
        outcome: 'POSTED',
        message: response.message || 'Transfer posted successfully to double-entry ledger',
        journalId: response.journalId,
      });
      onSuccess();
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setResult({
            outcome: 'REFUSED',
            message: 'In-flight operation currently locking accounts. Please retry.',
            errorDetail: '409 Conflict: Concurrent request with same Idempotency-Key.',
          });
        } else if (err.status === 422) {
          setResult({
            outcome: 'REFUSED',
            message: err.detail || 'Insufficient funds or payload mismatch on idempotent replay.',
            errorDetail: '422 Unprocessable Entity (Refused attempt ledgered)',
          });
        } else {
          setResult({
            outcome: 'REFUSED',
            message: err.detail || err.message,
            errorDetail: `${err.status} Error`,
          });
        }
      } else {
        setResult({
          outcome: 'REFUSED',
          message: err.message || 'Network failure',
          errorDetail: 'Connection failed',
        });
      }
      onSuccess(); // refresh balances and attempts
    } finally {
      setIsLoading(false);
    }
  };

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
          maxWidth: '560px',
          backgroundColor: 'var(--color-paper-light)',
          borderRadius: '6px',
          boxShadow: 'var(--shadow-ledger)',
          border: '1px solid var(--color-rule-green)',
          position: 'relative',
          padding: '2rem',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Close Button */}
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

        {/* Modal Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.75rem',
              color: 'var(--color-ink)',
              lineHeight: 1.1,
            }}
          >
            Post Internal Transfer
          </h2>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-ink-muted)',
              marginTop: '0.25rem',
            }}
          >
            Debits source account and credits destination account atomically with ordered row locking.
          </p>
        </div>

        {/* Source Account Banner */}
        <div
          style={{
            backgroundColor: 'var(--color-paper)',
            border: '1px solid rgba(47, 93, 80, 0.2)',
            borderRadius: '4px',
            padding: '0.75rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-ink-muted)',
              }}
            >
              Debit Source Account
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.05rem',
                fontWeight: 700,
              }}
            >
              {sourceAccount.number}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-ink-muted)',
              }}
            >
              Available Balance
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--color-rule-green)',
              }}
            >
              {formatPaise(sourceAccount.balance)}
            </div>
          </div>
        </div>

        {result ? (
          /* Result Stamp View */
          <div
            style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
            }}
          >
            <RubberStamp
              outcome={result.outcome}
              referenceId={result.journalId}
              reason={result.errorDetail}
              size="lg"
            />

            <div>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.25rem',
                  color:
                    result.outcome === 'POSTED'
                      ? 'var(--color-rule-green)'
                      : 'var(--color-stamp-vermilion)',
                  marginBottom: '0.5rem',
                }}
              >
                {result.outcome === 'POSTED' ? 'Transaction Posted' : 'Transaction Refused'}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-ink-muted)' }}>
                {result.message}
              </p>
              {result.outcome === 'REFUSED' && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    fontSize: '0.78rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-ink-muted)',
                    backgroundColor: 'var(--color-paper-dark)',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '4px',
                  }}
                >
                  ✓ Permanent refusal attempt row committed in <code>ledger_attempts</code> table via isolated <code>REQUIRES_NEW</code> transaction.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => {
                  setResult(null);
                  setIdempotencyKey(generateIdempotencyKey());
                }}
                style={{
                  padding: '0.5rem 1.25rem',
                  backgroundColor: 'var(--color-paper-dark)',
                  color: 'var(--color-ink)',
                  border: '1px solid rgba(0,0,0,0.15)',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Make Another Transfer
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '0.5rem 1.25rem',
                  backgroundColor: 'var(--color-rule-green)',
                  color: 'var(--color-paper-light)',
                  border: 'none',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Transfer Form */
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Destination Selection */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'var(--font-sans)' }}>
                  Credit Destination Account
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomAccount(!isCustomAccount)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-rule-green)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {isCustomAccount ? 'Select from known accounts' : 'Enter custom account number'}
                </button>
              </div>

              {isCustomAccount ? (
                <input
                  type="text"
                  placeholder="e.g. ACC-100002"
                  value={customDestinationNumber}
                  onChange={(e) => setCustomDestinationNumber(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.9rem',
                    border: '1px solid rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-paper)',
                  }}
                />
              ) : (
                <select
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.9rem',
                    border: '1px solid rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-paper)',
                  }}
                >
                  {candidateAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.number} (Balance: {formatPaise(acc.balance)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Amount (in Rupees)
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: 'var(--color-ink-muted)',
                  }}
                >
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={rupeesInput}
                  onChange={(e) => setRupeesInput(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem 0.55rem 1.85rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    border: isOverdraftViolated
                      ? '1px solid var(--color-stamp-vermilion)'
                      : '1px solid rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-paper)',
                  }}
                />
              </div>

              {/* Live Paise Conversion Preview */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '0.35rem',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: isOverdraftViolated ? 'var(--color-stamp-vermilion)' : 'var(--color-ink-muted)',
                }}
              >
                <span>
                  Converted to integer: <strong>{paiseAmount.toLocaleString()} paise</strong>
                </span>
                {isOverdraftViolated && (
                  <span style={{ fontWeight: 700 }}>
                    Exceeds balance & overdraft limit!
                  </span>
                )}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Narration / Reason
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Narration recorded in double-entry journal"
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.9rem',
                  border: '1px solid rgba(0,0,0,0.2)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--color-paper)',
                }}
              />
            </div>

            {/* Idempotency Key Bar */}
            <div
              style={{
                backgroundColor: 'var(--color-paper)',
                border: '1px dashed rgba(47, 93, 80, 0.3)',
                borderRadius: '4px',
                padding: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: 'var(--color-rule-green)',
                  }}
                >
                  Idempotency-Key Header (Replay Safe)
                </span>
                <button
                  type="button"
                  onClick={() => setIdempotencyKey(generateIdempotencyKey())}
                  title="Generate a fresh key"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-ink-muted)',
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={11} /> Regenerate
                </button>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  wordBreak: 'break-all',
                  color: 'var(--color-ink-muted)',
                }}
              >
                {idempotencyKey}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || paiseAmount <= 0}
              style={{
                marginTop: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--color-rule-green)',
                color: 'var(--color-paper-light)',
                border: 'none',
                borderRadius: '4px',
                fontFamily: 'var(--font-serif)',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: isLoading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: 'var(--shadow-stamp)',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="spin" /> Locking & Posting...
                </>
              ) : (
                <>
                  Commit Transfer <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
