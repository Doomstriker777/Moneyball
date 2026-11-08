import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, ShieldAlert, Key, Eye, EyeOff, UserPlus, CheckCircle, Shield } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
  initialTab?: 'login' | 'register';
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, initialTab = 'login' }) => {
  const { login, register, error, clearError, isLoading } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);

  // Form Fields
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<'HOLDER' | 'AUDITOR'>('HOLDER');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      if (tab === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, role);
      }
      onClose();
    } catch {
      if (tab === 'login') {
        setFailedAttempts((prev) => prev + 1);
      }
    }
  };

  const switchTab = (nextTab: 'login' | 'register') => {
    setTab(nextTab);
    clearError();
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
          backgroundColor: '#FFFFFF',
          borderRadius: '6px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          border: '1px solid #E2D9C8',
          position: 'relative',
          padding: '2.25rem',
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
            color: 'var(--color-ink-muted, #8C7E6A)',
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: 'rgba(30, 78, 56, 0.1)',
              color: '#1E4E38',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem auto',
            }}
          >
            {tab === 'login' ? <Lock size={22} /> : <UserPlus size={22} />}
          </div>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: '1.75rem',
              color: '#1A1815',
              margin: '0 0 0.35rem 0',
            }}
          >
            {tab === 'login' ? 'Sign In to Moneyball' : 'Create a New Account'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#8C7E6A', margin: 0, fontFamily: "'Newsreader', serif" }}>
            {tab === 'login'
              ? 'Enter your credentials to access your double-entry accounts.'
              : 'Register a new customer account or auditor inspection profile.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            backgroundColor: '#FAF8F4',
            padding: '0.25rem',
            borderRadius: '4px',
            border: '1px solid #E2D9C8',
            marginBottom: '1.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => switchTab('login')}
            style={{
              padding: '0.5rem',
              border: 'none',
              borderRadius: '3px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: tab === 'login' ? '#FFFFFF' : 'transparent',
              color: tab === 'login' ? '#1E4E38' : '#8C7E6A',
              boxShadow: tab === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchTab('register')}
            style={{
              padding: '0.5rem',
              border: 'none',
              borderRadius: '3px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: tab === 'register' ? '#FFFFFF' : 'transparent',
              color: tab === 'register' ? '#1E4E38' : '#8C7E6A',
              boxShadow: tab === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Error / Lockout Alert */}
        {error && (
          <div
            style={{
              marginBottom: '1.25rem',
              padding: '0.85rem',
              backgroundColor: 'rgba(179, 57, 39, 0.08)',
              color: '#B33927',
              fontSize: '0.82rem',
              borderRadius: '4px',
              border: '1px solid rgba(179, 57, 39, 0.3)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 600 }}>{error}</div>
              {tab === 'login' && failedAttempts >= 3 && failedAttempts < 5 && (
                <div style={{ marginTop: '0.35rem', color: '#9A5B13' }}>
                  Brute-Force Warning: Account locks for 15 minutes after 5 consecutive failures ({failedAttempts}/5).
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: '#5A524A', marginBottom: '0.35rem' }}>
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              placeholder="e.g. yourname@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.9rem',
                border: '1px solid #D6CEBE',
                borderRadius: '4px',
                backgroundColor: '#FAF8F4',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: '#5A524A' }}>
                PASSWORD
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8C7E6A',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.72rem',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={tab === 'register' ? 'Minimum 6 characters' : 'Enter password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={tab === 'register' ? 6 : undefined}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.9rem',
                border: '1px solid #D6CEBE',
                borderRadius: '4px',
                backgroundColor: '#FAF8F4',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Role Selection (Only in Register Mode) */}
          {tab === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: '#5A524A', marginBottom: '0.5rem' }}>
                ACCOUNT TYPE & ROLE
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {/* Option 1: Customer (HOLDER) */}
                <div
                  onClick={() => setRole('HOLDER')}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '4px',
                    border: `1.5px solid ${role === 'HOLDER' ? '#1E4E38' : '#D6CEBE'}`,
                    backgroundColor: role === 'HOLDER' ? 'rgba(30, 78, 56, 0.05)' : '#FAF8F4',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ marginTop: '2px', color: role === 'HOLDER' ? '#1E4E38' : '#8C7E6A' }}>
                    {role === 'HOLDER' ? <CheckCircle size={16} /> : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid #8C7E6A' }} />}
                  </div>
                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '0.85rem', color: '#1A1815' }}>
                      Customer Account (HOLDER)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#5A524A', marginTop: '0.15rem' }}>
                      Creates a personal banking ledger (starts at ₹0.00). Permitted to deposit, withdraw, and transfer funds.
                    </div>
                  </div>
                </div>

                {/* Option 2: Auditor (AUDITOR) */}
                <div
                  onClick={() => setRole('AUDITOR')}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '4px',
                    border: `1.5px solid ${role === 'AUDITOR' ? '#1E4E38' : '#D6CEBE'}`,
                    backgroundColor: role === 'AUDITOR' ? 'rgba(30, 78, 56, 0.05)' : '#FAF8F4',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ marginTop: '2px', color: role === 'AUDITOR' ? '#1E4E38' : '#8C7E6A' }}>
                    {role === 'AUDITOR' ? <CheckCircle size={16} /> : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid #8C7E6A' }} />}
                  </div>
                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '0.85rem', color: '#1A1815' }}>
                      Auditor Account (AUDITOR)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#5A524A', marginTop: '0.15rem' }}>
                      Oversight role with read-only inspection, live hash-chain verification, and JSON audit pack export.
                    </div>
                  </div>
                </div>

                {/* Option 3: Administrator (ADMIN) - LOCKED */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '4px',
                    border: '1.5px dashed #D6CEBE',
                    backgroundColor: '#F5F2EC',
                    opacity: 0.65,
                    cursor: 'not-allowed',
                  }}
                >
                  <div style={{ marginTop: '2px', color: '#8C7E6A' }}>
                    <Shield size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '0.85rem', color: '#5A524A' }}>
                        Administrator (ADMIN)
                      </span>
                      <span style={{
                        fontSize: '0.65rem',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontWeight: 700,
                        padding: '0.15rem 0.4rem',
                        borderRadius: '3px',
                        backgroundColor: '#B33927',
                        color: '#FFF8EE',
                      }}>
                        REGISTRATION CLOSED
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#8C7E6A', marginTop: '0.15rem' }}>
                      Admin accounts cannot be registered. The system administrator account is pre-provisioned in the database seed.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              backgroundColor: '#1E4E38',
              color: '#FFF8EE',
              border: 'none',
              borderRadius: '4px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: isLoading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Key size={16} />
            {isLoading
              ? 'Processing...'
              : tab === 'login'
              ? 'Sign In with Credentials'
              : 'Register & Open Account'}
          </button>
        </form>

        {/* Footnote / Quick Switcher */}
        <div style={{ marginTop: '1.5rem', borderTop: '1px dashed #D6CEBE', paddingTop: '1rem', textAlign: 'center' }}>
          {tab === 'login' ? (
            <div style={{ fontSize: '0.8rem', color: '#5A524A', fontFamily: "'Newsreader', serif" }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchTab('register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1E4E38',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Sign Up ➔
              </button>
              <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#8C7E6A', fontFamily: "'IBM Plex Mono', monospace" }}>
                Seed Admin: <code>admin@ledgerline.internal</code> / <code>Admin123!</code>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: '#5A524A', fontFamily: "'Newsreader', serif" }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchTab('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1E4E38',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Sign In ➔
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
