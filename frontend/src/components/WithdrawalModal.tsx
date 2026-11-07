import React, { useState, useEffect } from 'react';
import { Account, PostingResponse } from '../types';
import { api, ApiError } from '../api/client';
import { generateIdempotencyKey, rupeesToPaise } from '../utils/formatters';
import { RubberStamp } from './RubberStamp';
import { RefreshCw, X, ArrowUpRight } from 'lucide-react';

interface WithdrawalModalProps {
  account: Account;
  onClose: () => void;
  onSuccess: () => void;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  account,
  onClose,
  onSuccess,
}) => {
  const [rupeesInput, setRupeesInput] = useState<string>('75.00');
  const [reason, setReason] = useState<string>('ATM / Counter cash withdrawal');
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{
    outcome: 'POSTED' | 'REFUSED';
    message: string;
    journalId?: number;
    errorDetail?: string;
  } | null>(null);

  useEffect(() => {
    setIdempotencyKey(generateIdempotencyKey());
  }, [account.id]);

  const paiseAmount = rupeesToPaise(rupeesInput);
  const isOverdraw = account.balance - paiseAmount < -account.overdraftLimit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paiseAmount <= 0) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response: PostingResponse = await api.withdraw(
        {
          accountId: account.id,
          amount: paiseAmount,
          reason: reason || 'Cash withdrawal',
        },
        idempotencyKey
      );

      setResult({
        outcome: 'POSTED',
        message: response.message || 'Withdrawal posted successfully',
        journalId: response.journalId,
      });
      onSuccess();
    } catch (err: any) {
      const msg = err instanceof ApiError ? (err.detail || err.message) : err.message;
      setResult({
        outcome: 'REFUSED',
        message: msg,
        errorDetail: err instanceof ApiError ? `${err.status} Error (Attempt ledgered)` : 'Refused',
      });
      onSuccess();
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
          maxWidth: '520px',
          backgroundColor: 'var(--color-paper-light)',
          borderRadius: '6px',
          boxShadow: 'var(--shadow-ledger)',
          border: '1px solid var(--color-stamp-vermilion)',
          position: 'relative',
          padding: '2rem',
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

        <div style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.75rem',
              color: 'var(--color-ink)',
            }}
          >
            Withdraw Funds
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)', marginTop: '0.25rem' }}>
            Debits <code>{account.number}</code> and credits <code>EXTERNAL</code>. Tested against overdraft constraint.
          </p>
        </div>

        {result ? (
          <div
            style={{
              textAlign: 'center',
              padding: '1.5rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
            }}
          >
            <RubberStamp outcome={result.outcome} referenceId={result.journalId} reason={result.errorDetail} size="lg" />
            <div>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.25rem',
                  color: result.outcome === 'POSTED' ? 'var(--color-rule-green)' : 'var(--color-stamp-vermilion)',
                  marginBottom: '0.35rem',
                }}
              >
                {result.outcome === 'POSTED' ? 'Withdrawal Completed' : 'Withdrawal Refused'}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-ink-muted)' }}>
                {result.message}
              </p>
              {result.outcome === 'REFUSED' && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-stamp-vermilion)',
                  }}
                >
                  ✓ Permanent refusal attempt row committed in <code>ledger_attempts</code> via <code>REQUIRES_NEW</code>.
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '0.55rem 1.5rem',
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
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Withdrawal Amount (in Rupees)
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
                    border: isOverdraw ? '1px solid var(--color-stamp-vermilion)' : '1px solid rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-paper)',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '0.35rem',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: isOverdraw ? 'var(--color-stamp-vermilion)' : 'var(--color-ink-muted)',
                }}
              >
                <span>Integer: <strong>{paiseAmount.toLocaleString()} paise</strong></span>
                {isOverdraw && <span style={{ fontWeight: 700 }}>Will trigger insufficient funds refusal!</span>}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Reason / Note
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
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

            {/* Idempotency Key */}
            <div
              style={{
                backgroundColor: 'var(--color-paper)',
                border: '1px dashed rgba(179, 57, 39, 0.3)',
                borderRadius: '4px',
                padding: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-stamp-vermilion)' }}>
                  Idempotency-Key
                </span>
                <button
                  type="button"
                  onClick={() => setIdempotencyKey(generateIdempotencyKey())}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-ink-muted)',
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  <RefreshCw size={11} /> Regenerate
                </button>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)', wordBreak: 'break-all' }}>
                {idempotencyKey}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || paiseAmount <= 0}
              style={{
                marginTop: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--color-stamp-vermilion)',
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
              }}
            >
              <ArrowUpRight size={16} />
              {isLoading ? 'Processing Withdrawal...' : 'Commit Withdrawal'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
