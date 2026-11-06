import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'auth'>('overview');
  const [email, setEmail] = useState('admin@ledgerline.internal');
  const [password, setPassword] = useState('Admin123!');
  const [authResult, setAuthResult] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthResult('Authenticating...');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthResult(`Error: ${data.detail || data.title || 'Login failed'}`);
      } else {
        setAuthResult(`Success! Authenticated as ${data.role} (${data.email})`);
      }
    } catch (err: any) {
      setAuthResult(`Network error: ${err.message}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Editorial Header */}
      <header style={{
        borderBottom: 'var(--border-rule)',
        padding: '1.25rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        backgroundColor: 'var(--color-paper-light)'
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.75rem',
            letterSpacing: '-0.02em',
            fontWeight: 700
          }}>
            LedgerLine
          </h1>
          <span style={{
            fontSize: '0.825rem',
            color: 'var(--color-ink-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}>
            Double-Entry Core Engine • Day 1 AM Scaffold
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.25rem 0.6rem',
            borderRadius: '999px',
            backgroundColor: 'var(--color-rule-green-light)',
            color: 'var(--color-rule-green)',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            ● INVARIANT: Σ Balances = 0
          </span>
          <span className="tabular-nums" style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
            2026-11-06
          </span>
        </div>
      </header>

      {/* Main Ruled Ledger View */}
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        <div className="ledger-page" style={{ padding: '2.5rem', borderRadius: '4px' }}>
          <div style={{ marginLeft: '60px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '0.5rem' }}>
                  The Living Ledger
                </h2>
                <p style={{ color: 'var(--color-ink-muted)', fontSize: '0.95rem' }}>
                  Strict mathematical accounting. Zero floating-point drift. Double-entry conservation guaranteed by deferred database constraint triggers.
                </p>
              </div>
              <div style={{
                border: '2px solid var(--color-rule-green)',
                padding: '0.5rem 1rem',
                transform: 'rotate(-2deg)',
                boxShadow: 'var(--shadow-stamp)',
                backgroundColor: 'var(--color-paper-light)'
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  color: 'var(--color-rule-green)'
                }}>
                  POSTED • DAY 1 AM
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', borderBottom: 'var(--border-rule)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
              <button
                onClick={() => setActiveTab('overview')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1rem',
                  fontWeight: activeTab === 'overview' ? 700 : 400,
                  color: activeTab === 'overview' ? 'var(--color-rule-green)' : 'var(--color-ink-muted)',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'overview' ? '2px solid var(--color-rule-green)' : 'none',
                  paddingBottom: '0.25rem'
                }}>
                System Overview
              </button>
              <button
                onClick={() => setActiveTab('auth')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1rem',
                  fontWeight: activeTab === 'auth' ? 700 : 400,
                  color: activeTab === 'auth' ? 'var(--color-rule-green)' : 'var(--color-ink-muted)',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'auth' ? '2px solid var(--color-rule-green)' : 'none',
                  paddingBottom: '0.25rem'
                }}>
                Authentication Test
              </button>
            </div>

            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div style={{ border: 'var(--border-rule)', padding: '1.25rem', backgroundColor: 'var(--color-paper)' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: '0.75rem', color: 'var(--color-rule-green)' }}>
                    Seed Accounts
                  </h3>
                  <ul style={{ listStyle: 'none', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>EXT-000000</strong> (SYSTEM)</span>
                      <span className="tabular-nums">-₹1,500.00</span>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>ACC-100001</strong> (Holder 1)</span>
                      <span className="tabular-nums">+₹1,000.00</span>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>ACC-100002</strong> (Holder 2)</span>
                      <span className="tabular-nums">+₹500.00</span>
                    </li>
                    <li style={{
                      borderTop: '1px dashed var(--color-rule-green)',
                      paddingTop: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 700
                    }}>
                      <span>Global Conservation Sum:</span>
                      <span className="tabular-nums" style={{ color: 'var(--color-rule-green)' }}>₹0.00</span>
                    </li>
                  </ul>
                </div>

                <div style={{ border: 'var(--border-rule)', padding: '1.25rem', backgroundColor: 'var(--color-paper)' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: '0.75rem', color: 'var(--color-rule-green)' }}>
                    Seed Credentials
                  </h3>
                  <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-paper-dark)', textAlign: 'left' }}>
                        <th style={{ paddingBottom: '0.25rem' }}>Role</th>
                        <th style={{ paddingBottom: '0.25rem' }}>Email</th>
                        <th style={{ paddingBottom: '0.25rem' }}>Password</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 600 }}>ADMIN</td>
                        <td>admin@ledgerline.internal</td>
                        <td className="tabular-nums">Admin123!</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>AUDITOR</td>
                        <td>auditor@ledgerline.internal</td>
                        <td className="tabular-nums">Auditor123!</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>HOLDER 1</td>
                        <td>holder1@ledgerline.internal</td>
                        <td className="tabular-nums">Holder123!</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>HOLDER 2</td>
                        <td>holder2@ledgerline.internal</td>
                        <td className="tabular-nums">Holder222!</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'auth' && (
              <div style={{ maxWidth: '420px', margin: '0 auto' }}>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        fontFamily: 'var(--font-sans)',
                        border: 'var(--border-rule)',
                        backgroundColor: 'var(--color-paper)',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        fontFamily: 'var(--font-sans)',
                        border: 'var(--border-rule)',
                        backgroundColor: 'var(--color-paper)',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{
                      padding: '0.65rem 1.25rem',
                      backgroundColor: 'var(--color-rule-green)',
                      color: 'var(--color-paper-light)',
                      border: 'none',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-serif)',
                      fontSize: '0.95rem'
                    }}>
                    Test Login Call
                  </button>
                </form>

                {authResult && (
                  <div style={{
                    marginTop: '1.25rem',
                    padding: '0.75rem',
                    backgroundColor: authResult.startsWith('Success') ? 'var(--color-rule-green-light)' : 'var(--color-stamp-vermilion-light)',
                    color: authResult.startsWith('Success') ? 'var(--color-rule-green)' : 'var(--color-stamp-vermilion)',
                    fontSize: '0.85rem',
                    border: '1px solid currentColor'
                  }}>
                    {authResult}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

