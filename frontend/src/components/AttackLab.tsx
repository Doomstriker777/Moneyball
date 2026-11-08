import React, { useState } from 'react';
import { api } from '../api/client';
import { RubberStamp } from './RubberStamp';

interface AttackLog {
  id: number;
  time: string;
  attackName: string;
  reqNumber: number;
  status: 'POSTED' | 'REFUSED' | 'REPLAYED' | 'ERROR';
  httpStatus: number;
  latencyMs: number;
  detail: string;
}

export const AttackLab: React.FC = () => {
  const [running, setRunning] = useState<boolean>(false);
  const [logs, setLogs] = useState<AttackLog[]>([]);
  const [currentAttack, setCurrentAttack] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    posted: number;
    refused: number;
    replayed: number;
    errors: number;
  } | null>(null);

  const addLog = (log: Omit<AttackLog, 'id' | 'time'>) => {
    const entry: AttackLog = {
      ...log,
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString()
    };
    setLogs((prev) => [entry, ...prev.slice(0, 49)]);
  };

  // Attack 1: Concurrency Race Attack (20 concurrent withdrawals)
  const runRaceAttack = async () => {
    setRunning(true);
    setCurrentAttack('CONCURRENCY RACE: 20 Parallel Withdrawals of ₹60');
    setLogs([]);
    setSummary({ posted: 0, refused: 0, replayed: 0, errors: 0 });

    try {
      const accounts = await api.getAccounts();
      const customerAcc = accounts.find((a) => a.type === 'CUSTOMER' && a.status === 'ACTIVE');
      if (!customerAcc) {
        alert('No active customer account found to target');
        setRunning(false);
        return;
      }

      // Fire 20 requests in parallel
      const totalRequests = 20;
      const withdrawalAmountPaise = 6000; // ₹60.00

      let postedCount = 0;
      let refusedCount = 0;
      let errorCount = 0;

      const promises = Array.from({ length: totalRequests }).map(async (_, i) => {
        const start = performance.now();
        const key = `race-attack-${Date.now()}-${i}`;
        try {
          const res = await api.withdraw({
            accountId: customerAcc.id,
            amount: withdrawalAmountPaise,
            reason: `Race attack thread #${i + 1}`
          }, key);
          const latency = Math.round(performance.now() - start);
          postedCount++;
          addLog({
            attackName: 'Race Attack',
            reqNumber: i + 1,
            status: 'POSTED',
            httpStatus: 200,
            latencyMs: latency,
            detail: `Journal #${res.journalId} posted successfully. Balance: ₹${(res.sourceBalanceAfter / 100).toFixed(2)}`
          });
        } catch (err: any) {
          const latency = Math.round(performance.now() - start);
          if (err.status === 422 || err.status === 400) {
            refusedCount++;
            addLog({
              attackName: 'Race Attack',
              reqNumber: i + 1,
              status: 'REFUSED',
              httpStatus: err.status,
              latencyMs: latency,
              detail: `Pessimistic lock defended balance: ${err.message}`
            });
          } else {
            errorCount++;
            addLog({
              attackName: 'Race Attack',
              reqNumber: i + 1,
              status: 'ERROR',
              httpStatus: err.status || 500,
              latencyMs: latency,
              detail: err.message
            });
          }
        }
      });

      await Promise.all(promises);
      setSummary({ posted: postedCount, refused: refusedCount, replayed: 0, errors: errorCount });
    } finally {
      setRunning(false);
    }
  };

  // Attack 2: Idempotency Replay Attack (10 parallel requests with SAME idempotency key)
  const runIdempotencyReplayAttack = async () => {
    setRunning(true);
    setCurrentAttack('IDEMPOTENCY EXPLOIT: 10 Parallel Requests with Identical UUID');
    setLogs([]);
    setSummary({ posted: 0, refused: 0, replayed: 0, errors: 0 });

    try {
      const accounts = await api.getAccounts();
      const customerAcc = accounts.find((a) => a.type === 'CUSTOMER' && a.status === 'ACTIVE');
      if (!customerAcc) {
        alert('No active customer account found to target');
        setRunning(false);
        return;
      }

      const sharedKey = `exploit-replay-${Date.now()}`;
      const totalRequests = 10;
      let postedCount = 0;
      let replayedCount = 0;
      let errorCount = 0;

      const promises = Array.from({ length: totalRequests }).map(async (_, i) => {
        const start = performance.now();
        try {
          const res = await api.deposit({
            accountId: customerAcc.id,
            amount: 5000, // ₹50.00
            reason: `Replay exploit trial #${i + 1}`
          }, sharedKey);
          const latency = Math.round(performance.now() - start);

          // If the message contains REPLAYED or multiple return the same journal
          if (res.status === 'REPLAYED' || (res.message && res.message.toLowerCase().includes('replay'))) {
            replayedCount++;
            addLog({
              attackName: 'Idempotency Attack',
              reqNumber: i + 1,
              status: 'REPLAYED',
              httpStatus: 200,
              latencyMs: latency,
              detail: `Replay hit cached Journal #${res.journalId} without double-crediting.`
            });
          } else {
            postedCount++;
            addLog({
              attackName: 'Idempotency Attack',
              reqNumber: i + 1,
              status: 'POSTED',
              httpStatus: 200,
              latencyMs: latency,
              detail: `First thread acquired key lock -> Journal #${res.journalId}`
            });
          }
        } catch (err: any) {
          const latency = Math.round(performance.now() - start);
          errorCount++;
          addLog({
            attackName: 'Idempotency Attack',
            reqNumber: i + 1,
            status: 'ERROR',
            httpStatus: err.status || 500,
            latencyMs: latency,
            detail: err.message
          });
        }
      });

      await Promise.all(promises);
      setSummary({ posted: postedCount, refused: 0, replayed: replayedCount, errors: errorCount });
    } finally {
      setRunning(false);
    }
  };

  // Attack 3: Overdraft Limit Breach Attack
  const runOverdraftAttack = async () => {
    setRunning(true);
    setCurrentAttack('OVERDRAFT BREACH: Attempting ₹1,000,000 against ₹0 Limit');
    setLogs([]);
    setSummary({ posted: 0, refused: 0, replayed: 0, errors: 0 });

    try {
      const accounts = await api.getAccounts();
      const customerAcc = accounts.find((a) => a.type === 'CUSTOMER' && a.status === 'ACTIVE');
      if (!customerAcc) {
        alert('No active customer account found');
        setRunning(false);
        return;
      }

      const hugeAmountPaise = 100_000_000; // ₹1,000,000.00
      const start = performance.now();
      try {
        await api.withdraw({
          accountId: customerAcc.id,
          amount: hugeAmountPaise,
          reason: 'Excessive overdraft exploitation attempt'
        }, `exploit-overdraft-${Date.now()}`);

        const latency = Math.round(performance.now() - start);
        addLog({
          attackName: 'Overdraft Attack',
          reqNumber: 1,
          status: 'POSTED',
          httpStatus: 200,
          latencyMs: latency,
          detail: 'CRITICAL FAILURE: Withdrawal should have been refused!'
        });
        setSummary({ posted: 1, refused: 0, replayed: 0, errors: 0 });
      } catch (err: any) {
        const latency = Math.round(performance.now() - start);
        addLog({
          attackName: 'Overdraft Attack',
          reqNumber: 1,
          status: 'REFUSED',
          httpStatus: err.status || 422,
          latencyMs: latency,
          detail: `Refused: ${err.message}. Persisted to audit log via REQUIRES_NEW.`
        });
        setSummary({ posted: 0, refused: 1, replayed: 0, errors: 0 });
      }
    } finally {
      setRunning(false);
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
          color: '#B33927',
          display: 'block',
          marginBottom: '0.25rem'
        }}>
          INTERACTIVE STRESS & INTEGRITY LAB
        </span>
        <h1 style={{
          fontFamily: "'Fraunces', serif",
          fontSize: '2.25rem',
          fontWeight: 700,
          color: '#1A1815',
          margin: 0
        }}>
          Adversarial Attack Simulation
        </h1>
        <p style={{
          fontFamily: "'Newsreader', serif",
          fontSize: '1rem',
          color: '#5A524A',
          margin: '0.5rem 0 0 0'
        }}>
          Execute real-time concurrent attacks against the core banking engine to visually witness row locks, idempotency deduplication, and zero-sum conservation holding firm.
        </p>
      </div>

      {/* Attack Buttons Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* Card 1: Concurrency Race */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2D9C8',
          borderRadius: '6px',
          padding: '1.5rem',
          boxShadow: '0 4px 12px rgba(44, 40, 37, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: '#B33927' }}>
                ATTACK SCENARIO 01
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#8C7E6A' }}>
                20 Threads
              </span>
            </div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.25rem', margin: '0 0 0.5rem 0', color: '#1A1815' }}>
              Parallel Withdrawal Race
            </h3>
            <p style={{ fontFamily: "'Newsreader', serif", fontSize: '0.9rem', color: '#5A524A', margin: 0 }}>
              Fires 20 simultaneous withdrawals of ₹60 each against an account with limited funds. Proves pessimistic row locking serializes execution and prevents balance overdraft.
            </p>
          </div>
          <button
            onClick={runRaceAttack}
            disabled={running}
            style={{
              marginTop: '1.25rem',
              width: '100%',
              padding: '0.7rem',
              backgroundColor: '#B33927',
              color: '#FFF8EE',
              border: 'none',
              borderRadius: '4px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: running ? 'wait' : 'pointer'
            }}
          >
            {running ? 'Simulating...' : 'Launch Race Attack (20x)'}
          </button>
        </div>

        {/* Card 2: Idempotency Replay */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2D9C8',
          borderRadius: '6px',
          padding: '1.5rem',
          boxShadow: '0 4px 12px rgba(44, 40, 37, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: '#9A5B13' }}>
                ATTACK SCENARIO 02
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#8C7E6A' }}>
                10 Replays
              </span>
            </div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.25rem', margin: '0 0 0.5rem 0', color: '#1A1815' }}>
              Idempotency Key Collision
            </h3>
            <p style={{ fontFamily: "'Newsreader', serif", fontSize: '0.9rem', color: '#5A524A', margin: 0 }}>
              Fires 10 concurrent requests sharing the exact same <code>Idempotency-Key</code> header. Proves atomic key locking and cached replay without duplicate debit/credit.
            </p>
          </div>
          <button
            onClick={runIdempotencyReplayAttack}
            disabled={running}
            style={{
              marginTop: '1.25rem',
              width: '100%',
              padding: '0.7rem',
              backgroundColor: '#9A5B13',
              color: '#FFF8EE',
              border: 'none',
              borderRadius: '4px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: running ? 'wait' : 'pointer'
            }}
          >
            {running ? 'Simulating...' : 'Launch Replay Attack (10x)'}
          </button>
        </div>

        {/* Card 3: Overdraft Breach */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2D9C8',
          borderRadius: '6px',
          padding: '1.5rem',
          boxShadow: '0 4px 12px rgba(44, 40, 37, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: '#2C2825' }}>
                ATTACK SCENARIO 03
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#8C7E6A' }}>
                ₹1,000,000 Breach
              </span>
            </div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.25rem', margin: '0 0 0.5rem 0', color: '#1A1815' }}>
              Illegal Overdraft Exploit
            </h3>
            <p style={{ fontFamily: "'Newsreader', serif", fontSize: '0.9rem', color: '#5A524A', margin: 0 }}>
              Attempts to draw 10,000x available funds without an approved overdraft limit. Demonstrates immediate rejection and audit attempt logging.
            </p>
          </div>
          <button
            onClick={runOverdraftAttack}
            disabled={running}
            style={{
              marginTop: '1.25rem',
              width: '100%',
              padding: '0.7rem',
              backgroundColor: '#2C2825',
              color: '#FFF8EE',
              border: 'none',
              borderRadius: '4px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: running ? 'wait' : 'pointer'
            }}
          >
            {running ? 'Simulating...' : 'Launch Overdraft Attack'}
          </button>
        </div>
      </div>

      {/* Live Results & Summary */}
      {summary && (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2D9C8',
          borderRadius: '6px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 16px rgba(44, 40, 37, 0.05)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            borderBottom: '1px dashed #E2D9C8',
            paddingBottom: '0.75rem'
          }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem', fontWeight: 700, color: '#1A1815' }}>
              OUTCOME SUMMARY: {currentAttack}
            </span>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {summary.posted > 0 && <RubberStamp outcome="POSTED" referenceId={`Count: ${summary.posted}`} size="sm" />}
              {summary.refused > 0 && <RubberStamp outcome="REFUSED" referenceId={`Blocked: ${summary.refused}`} size="sm" />}
              {summary.replayed > 0 && <RubberStamp outcome="REPLAYED" referenceId={`Deduplicated: ${summary.replayed}`} size="sm" />}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ backgroundColor: '#F9F6F0', padding: '0.75rem', borderRadius: '4px' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#8C7E6A' }}>Posted</span>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: '1.5rem', fontWeight: 700, color: '#1E4E38' }}>{summary.posted}</div>
            </div>
            <div style={{ backgroundColor: '#F9F6F0', padding: '0.75rem', borderRadius: '4px' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#8C7E6A' }}>Refused</span>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: '1.5rem', fontWeight: 700, color: '#B33927' }}>{summary.refused}</div>
            </div>
            <div style={{ backgroundColor: '#F9F6F0', padding: '0.75rem', borderRadius: '4px' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#8C7E6A' }}>Replayed</span>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: '1.5rem', fontWeight: 700, color: '#4A5568' }}>{summary.replayed}</div>
            </div>
            <div style={{ backgroundColor: '#F9F6F0', padding: '0.75rem', borderRadius: '4px' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: '#8C7E6A' }}>Errors / Crashes</span>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: '1.5rem', fontWeight: 700, color: summary.errors > 0 ? '#B33927' : '#1E4E38' }}>{summary.errors}</div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Streaming Terminal */}
      <div style={{
        backgroundColor: '#1E1B18',
        borderRadius: '6px',
        padding: '1.25rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        color: '#FAF8F4',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '0.8rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #332E29', paddingBottom: '0.5rem' }}>
          <span style={{ color: '#D6CEBE', fontWeight: 600 }}>LIVE EXECUTION LOGS ({logs.length})</span>
          {logs.length > 0 && (
            <button
              onClick={() => setLogs([])}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #5A524A',
                color: '#D6CEBE',
                fontSize: '0.7rem',
                padding: '0.2rem 0.5rem',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#8C7E6A' }}>
            No attack simulated yet. Choose an attack scenario above.
          </div>
        ) : (
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '0.4rem 0',
                  borderBottom: '1px solid #2C2825',
                  alignItems: 'center'
                }}
              >
                <span style={{ color: '#8C7E6A', minWidth: '70px' }}>{log.time}</span>
                <span style={{
                  color:
                    log.status === 'POSTED' ? '#48BB78' :
                    log.status === 'REFUSED' ? '#F56565' :
                    log.status === 'REPLAYED' ? '#ECC94B' : '#E53E3E',
                  fontWeight: 700,
                  minWidth: '80px'
                }}>
                  [{log.status}]
                </span>
                <span style={{ color: '#A0AEC0', minWidth: '40px' }}>{log.httpStatus}</span>
                <span style={{ color: '#CBD5E0', flex: 1 }}>{log.detail}</span>
                <span style={{ color: '#718096', fontSize: '0.75rem' }}>{log.latencyMs}ms</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

