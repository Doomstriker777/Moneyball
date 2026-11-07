import React, { useState, useEffect } from 'react';
import { Account, PostingResponse } from '../types';
import { api, ApiError } from '../api/client';
import { generateIdempotencyKey, rupeesToPaise } from '../utils/formatters';
import { RubberStamp } from './RubberStamp';
import { RefreshCw, X, ArrowDownLeft } from 'lucide-react';

interface DepositModalProps {
  account: Account;
  onClose: () => void;
  onSuccess: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  account,
  onClose,
  onSuccess,
}) => {
  const [rupeesInput, setRupeesInput] = useState<string>('250.00');
  const [reason, setReason] = useState<string>('Simulated external funding');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paiseAmount <= 0) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response: PostingResponse = await api.deposit(
        {
          accountId: account.id,
          amount: paiseAmount,
          reason: reason || 'Simulated external deposit',
        },
        idempotencyKey
      );

      setResult({
        outcome: 'POSTED',
        message: response.message || 'Deposit posted to double-entry ledger',
        journalId: response.journalId,
      });
      onSuccess();
    } catch (err: any) {
      const msg = err instanceof ApiError ? (err.detail || err.message) : err.message;
      setResult({
        outcome: 'REFUSED',
        message: msg,
        errorDetail: err instanceof ApiError ? `${err.status} Error` : 'Failed',
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
          border: '1px solid var(--color-rule-green)',
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
            Deposit External Funds
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)', marginTop: '0.25rem' }}>
            Simulates external capital inflow. Debits <code>EXTERNAL</code> system account and credits <code>{account.number}</code>.
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
                {result.outcome === 'POSTED' ? 'Deposit Completed' : 'Deposit Refused'}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-ink-muted)' }}>
                {result.message}
              </p>
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
                Deposit Amount (in Rupees)
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
                    border: '1px solid rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-paper)',
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: '0.35rem',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-ink-muted)',
                }}
              >
                Integer Paise: <strong>{paiseAmount.toLocaleString()} paise</strong>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Narration
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
                border: '1px dashed rgba(47, 93, 80, 0.3)',
                borderRadius: '4px',
                padding: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-rule-green)' }}>
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
              }}
            >
              <ArrowDownLeft size={16} />
              {isLoading ? 'Posting Deposit...' : 'Post Deposit to Ledger'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
