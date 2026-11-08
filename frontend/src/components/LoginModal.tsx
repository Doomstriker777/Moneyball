import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, ShieldAlert, Key } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
  const { login, error, clearError, switchRole, isLoading } = useAuth();
  const [email, setEmail] = useState<string>('holder1@ledgerline.internal');
  const [password, setPassword] = useState<string>('Holder123!');
  const [failedAttempts, setFailedAttempts] = useState<number>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      onClose();
    } catch {
      setFailedAttempts((prev) => prev + 1);
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
          maxWidth: '460px',
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

        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-rule-green-light)',
              color: 'var(--color-rule-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem auto',
            }}
          >
            <Lock size={22} />
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.65rem',
              color: 'var(--color-ink)',
            }}
          >
            Authenticate Session
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)', marginTop: '0.2rem' }}>
            Protected by Spring Security JWT & 5-attempt brute force lockout.
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              backgroundColor: 'var(--color-stamp-vermilion-light)',
              color: 'var(--color-stamp-vermilion)',
              fontSize: '0.82rem',
              borderRadius: '4px',
              border: '1px solid rgba(179, 57, 39, 0.3)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
            }}
          >
            <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div>{error}</div>
              {failedAttempts >= 3 && failedAttempts < 5 && (
                <div style={{ marginTop: '0.25rem', fontWeight: 700 }}>
                  Warning: Account will lock for 15 minutes after 5 consecutive failures ({failedAttempts}/5 attempts).
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
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
              gap: '0.4rem',
            }}
          >
            <Key size={16} />
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Switcher inside Modal */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px dashed rgba(0,0,0,0.15)', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)', marginBottom: '0.5rem', textAlign: 'center' }}>
            Quick 1-Click Role Logins:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => { switchRole('ADMIN'); onClose(); }}
              style={{ padding: '0.4rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', backgroundColor: 'var(--color-paper)', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '4px', cursor: 'pointer' }}
            >
              ADMIN
            </button>
            <button
              type="button"
              onClick={() => { switchRole('AUDITOR'); onClose(); }}
              style={{ padding: '0.4rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', backgroundColor: 'var(--color-paper)', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '4px', cursor: 'pointer' }}
            >
              AUDITOR
            </button>
            <button
              type="button"
              onClick={() => { switchRole('HOLDER1'); onClose(); }}
              style={{ padding: '0.4rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', backgroundColor: 'var(--color-paper)', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '4px', cursor: 'pointer' }}
            >
              HOLDER 1
            </button>
            <button
              type="button"
              onClick={() => { switchRole('HOLDER2'); onClose(); }}
              style={{ padding: '0.4rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', backgroundColor: 'var(--color-paper)', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '4px', cursor: 'pointer' }}
            >
              HOLDER 2
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

