import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, LogOut, Download } from 'lucide-react';

export type NavTab = 'dashboard' | 'proof' | 'admin' | 'attack';

interface HeaderProps {
  onOpenLogin: () => void;
  systemConservationStatus?: 'BALANCED' | 'DISCREPANCY';
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onExportAuditPack?: () => void;
  isExportingAuditPack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenLogin,
  systemConservationStatus = 'BALANCED',
  currentTab,
  onSelectTab,
  onExportAuditPack,
  isExportingAuditPack = false,
}) => {
  const { user, switchRole, logout, isLoading } = useAuth();

  return (
    <header
      style={{
        borderBottom: 'var(--border-rule)',
        padding: '0.85rem 1.75rem',
        backgroundColor: 'var(--color-paper-light)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Brand & Invariant Pill */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.25rem' }}>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.65rem',
                letterSpacing: '-0.02em',
                fontWeight: 800,
                color: 'var(--color-ink)',
                lineHeight: 1,
              }}
            >
              Moneyball
            </h1>
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--color-ink-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontFamily: 'var(--font-mono)',
              }}
            >
              The Living Ledger • Core Engine
            </span>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              backgroundColor:
                systemConservationStatus === 'BALANCED'
                  ? 'var(--color-rule-green-light)'
                  : 'var(--color-stamp-vermilion-light)',
              color:
                systemConservationStatus === 'BALANCED'
                  ? 'var(--color-rule-green)'
                  : 'var(--color-stamp-vermilion)',
              fontSize: '0.75rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              border: `1px solid ${
                systemConservationStatus === 'BALANCED'
                  ? 'rgba(30, 78, 56, 0.3)'
                  : 'rgba(179, 57, 39, 0.3)'
              }`,
            }}
          >
            ● Σ ALL BALANCES = 0
          </span>
        </div>

        {/* Demo 1-Click Role Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'var(--color-paper-dark)',
            padding: '0.25rem 0.4rem',
            borderRadius: '6px',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 700,
              color: 'var(--color-ink-muted)',
              padding: '0 0.4rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Demo Switcher:
          </span>

          <button
            onClick={() => switchRole('ADMIN')}
            disabled={isLoading}
            style={{
              padding: '0.25rem 0.65rem',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: user?.role === 'ADMIN' ? 700 : 500,
              backgroundColor:
                user?.role === 'ADMIN'
                  ? 'var(--color-rule-green)'
                  : 'var(--color-paper-light)',
              color:
                user?.role === 'ADMIN'
                  ? 'var(--color-paper-light)'
                  : 'var(--color-ink)',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            ADMIN
          </button>

          <button
            onClick={() => switchRole('HOLDER1')}
            disabled={isLoading}
            style={{
              padding: '0.25rem 0.65rem',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              fontWeight:
                user?.email === 'holder1@ledgerline.internal' ? 700 : 500,
              backgroundColor:
                user?.email === 'holder1@ledgerline.internal'
                  ? 'var(--color-rule-green)'
                  : 'var(--color-paper-light)',
              color:
                user?.email === 'holder1@ledgerline.internal'
                  ? 'var(--color-paper-light)'
                  : 'var(--color-ink)',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            HOLDER 1
          </button>

          <button
            onClick={() => switchRole('HOLDER2')}
            disabled={isLoading}
            style={{
              padding: '0.25rem 0.65rem',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              fontWeight:
                user?.email === 'holder2@ledgerline.internal' ? 700 : 500,
              backgroundColor:
                user?.email === 'holder2@ledgerline.internal'
                  ? 'var(--color-rule-green)'
                  : 'var(--color-paper-light)',
              color:
                user?.email === 'holder2@ledgerline.internal'
                  ? 'var(--color-paper-light)'
                  : 'var(--color-ink)',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            HOLDER 2
          </button>

          <button
            onClick={() => switchRole('AUDITOR')}
            disabled={isLoading}
            style={{
              padding: '0.25rem 0.65rem',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: user?.role === 'AUDITOR' ? 700 : 500,
              backgroundColor:
                user?.role === 'AUDITOR'
                  ? 'var(--color-rule-green)'
                  : 'var(--color-paper-light)',
              color:
                user?.role === 'AUDITOR'
                  ? 'var(--color-paper-light)'
                  : 'var(--color-ink)',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            AUDITOR
          </button>
        </div>

        {/* User Identity / Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {user?.role === 'AUDITOR' && onExportAuditPack && (
            <button
              onClick={onExportAuditPack}
              disabled={isExportingAuditPack}
              title="Download cryptographic audit pack containing all ledgers, attempts, flags and instructions"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                backgroundColor: 'var(--color-stamp-saffron, #9A5B13)',
                color: '#FFF8EE',
                border: 'none',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: isExportingAuditPack ? 'wait' : 'pointer',
              }}
            >
              <Download size={14} />
              {isExportingAuditPack ? 'Exporting...' : 'Export Audit Pack'}
            </button>
          )}

          {user ? (
            <>
              <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {user.email}
                </div>
                <div
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--color-ink-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Role: <strong>{user.role}</strong>
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                style={{
                  background: 'none',
                  border: '1px solid rgba(0,0,0,0.15)',
                  padding: '0.4rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: 'var(--color-ink-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={onOpenLogin}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                backgroundColor: 'var(--color-rule-green)',
                color: 'var(--color-paper-light)',
                border: 'none',
                borderRadius: '4px',
                fontFamily: 'var(--font-serif)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <Lock size={14} />
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Editorial Navigation Tabs Strip */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0.5rem auto 0 auto',
          display: 'flex',
          gap: '0.5rem',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          paddingTop: '0.5rem',
        }}
      >
        <button
          onClick={() => onSelectTab('dashboard')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: currentTab === 'dashboard' ? '2px solid var(--color-rule-green, #1E4E38)' : '2px solid transparent',
            padding: '0.35rem 0.85rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            fontWeight: currentTab === 'dashboard' ? 700 : 500,
            color: currentTab === 'dashboard' ? 'var(--color-rule-green, #1E4E38)' : 'var(--color-ink-muted, #8C7E6A)',
            cursor: 'pointer',
          }}
        >
          Overview & Accounts
        </button>

        <button
          onClick={() => onSelectTab('proof')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: currentTab === 'proof' ? '2px solid var(--color-rule-green, #1E4E38)' : '2px solid transparent',
            padding: '0.35rem 0.85rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            fontWeight: currentTab === 'proof' ? 700 : 500,
            color: currentTab === 'proof' ? 'var(--color-rule-green, #1E4E38)' : 'var(--color-ink-muted, #8C7E6A)',
            cursor: 'pointer',
          }}
        >
          Proof & Invariants
        </button>

        {user?.role === 'ADMIN' && (
          <button
            onClick={() => onSelectTab('admin')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: currentTab === 'admin' ? '2px solid var(--color-stamp-vermilion, #B33927)' : '2px solid transparent',
              padding: '0.35rem 0.85rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              fontWeight: currentTab === 'admin' ? 700 : 500,
              color: currentTab === 'admin' ? 'var(--color-stamp-vermilion, #B33927)' : 'var(--color-ink-muted, #8C7E6A)',
              cursor: 'pointer',
            }}
          >
            Admin & Compliance
          </button>
        )}

        <button
          onClick={() => onSelectTab('attack')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: currentTab === 'attack' ? '2px solid var(--color-stamp-vermilion, #B33927)' : '2px solid transparent',
            padding: '0.35rem 0.85rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            fontWeight: currentTab === 'attack' ? 700 : 500,
            color: currentTab === 'attack' ? 'var(--color-stamp-vermilion, #B33927)' : 'var(--color-ink-muted, #8C7E6A)',
            cursor: 'pointer',
          }}
        >
          ⚡ Attack Lab
        </button>
      </div>
    </header>
  );
};
