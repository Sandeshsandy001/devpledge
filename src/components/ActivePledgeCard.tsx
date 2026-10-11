'use client';

import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import confetti from 'canvas-confetti';
import { 
  GitCommit, 
  Clock, 
  Coins, 
  ShieldCheck, 
  AlertTriangle, 
  ExternalLink, 
  Loader2, 
  RefreshCw, 
  Flame, 
  Plus
} from 'lucide-react';
import { PledgeAccountData } from '@/lib/solana/account';
import { CommitItem, GitHubProfile } from '@/lib/github/githubService';

interface ActivePledgeCardProps {
  pledge: PledgeAccountData;
  onRefresh: () => void;
}

export function ActivePledgeCard({ pledge, onRefresh }: ActivePledgeCardProps) {
  const { connection } = useConnection();
  const { sendTransaction, signTransaction } = useWallet();

  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [isTargetMet, setIsTargetMet] = useState(false);
  const [loadingCommits, setLoadingCommits] = useState(true);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    isExpired: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: false });

  // Settlement & Slashing states
  const [isSettling, setIsSettling] = useState(false);
  const [isSlashing, setIsSlashing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState<{
    type: 'settle' | 'slash';
    signature: string;
    message: string;
    explorerUrl: string;
  } | null>(null);

  // Calculate live countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = pledge.deadline - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: true });
      } else {
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        setTimeLeft({ hours, minutes, seconds, totalSeconds: diff, isExpired: false });
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [pledge.deadline]);

  // Fetch GitHub verification data
  const checkGitHub = async () => {
    try {
      setLoadingCommits(true);
      const res = await fetch('/api/github/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: pledge.githubUsername,
          startTime: pledge.startTime,
          targetCommits: pledge.targetCommits,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setProfile(data.profile || null);
        setCommits(data.commits || []);
        setVerifiedCount(data.totalCommitsSinceStart);
        setIsTargetMet(data.targetMet);
      }
    } catch (err) {
      console.error('Failed to verify GitHub commits:', err);
    } finally {
      setLoadingCommits(false);
    }
  };

  useEffect(() => {
    checkGitHub();
    const interval = setInterval(checkGitHub, 30000);
    return () => clearInterval(interval);
  }, [pledge.githubUsername, pledge.startTime, pledge.targetCommits]);

  // Handle Settle (Refund)
  const handleSettle = async () => {
    setActionError('');
    setActionSuccess(null);
    try {
      setIsSettling(true);
      const res = await fetch('/api/oracle/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: pledge.user }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.requiresUserSignature && data.transactionBase64) {
          const tx = Transaction.from(Buffer.from(data.transactionBase64, 'base64'));
          
          let signature = '';
          if (signTransaction) {
            const signedTx = await signTransaction(tx);
            const submitRes = await fetch('/api/oracle/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                transactionBase64: signedTx.serialize().toString('base64'),
              }),
            });
            const submitData = await submitRes.json();
            if (!submitData.success) {
              throw new Error(submitData.error || 'Failed to broadcast settlement transaction');
            }
            signature = submitData.signature;
          } else {
            signature = await sendTransaction(tx, connection);
            try {
              await connection.confirmTransaction(signature, 'confirmed');
            } catch (e) {
              console.warn('Confirm polling warning:', e);
            }
          }

          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
          setActionSuccess({
            type: 'settle',
            signature,
            message: `100% deposit (${pledge.amountSol} SOL) refunded to your wallet.`,
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
          });
          onRefresh();
          return;
        }

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        setActionSuccess({
          type: 'settle',
          signature: data.signature,
          message: data.message || `100% deposit (${pledge.amountSol} SOL) refunded to your wallet.`,
          explorerUrl: data.explorerUrl,
        });
        onRefresh();
      } else {
        setActionError(data.error || 'Oracle failed to settle pledge.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(`Settlement error: ${msg}`);
    } finally {
      setIsSettling(false);
    }
  };

  // Handle Slash
  const handleSlash = async () => {
    setActionError('');
    setActionSuccess(null);
    try {
      setIsSlashing(true);
      const res = await fetch('/api/oracle/slash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: pledge.user }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.requiresUserSignature && data.transactionBase64) {
          const tx = Transaction.from(Buffer.from(data.transactionBase64, 'base64'));
          
          let signature = '';
          if (signTransaction) {
            const signedTx = await signTransaction(tx);
            const submitRes = await fetch('/api/oracle/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                transactionBase64: signedTx.serialize().toString('base64'),
              }),
            });
            const submitData = await submitRes.json();
            if (!submitData.success) {
              throw new Error(submitData.error || 'Failed to broadcast slashing transaction');
            }
            signature = submitData.signature;
          } else {
            signature = await sendTransaction(tx, connection);
            try {
              await connection.confirmTransaction(signature, 'confirmed');
            } catch (e) {
              console.warn('Confirm polling warning:', e);
            }
          }

          setActionSuccess({
            type: 'slash',
            signature,
            message: data.message || `Funds slashed and sent to community treasury: ${pledge.treasury}`,
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
          });
          onRefresh();
          return;
        }

        setActionSuccess({
          type: 'slash',
          signature: data.signature,
          message: data.message || `Funds slashed and sent to community treasury: ${pledge.treasury}`,
          explorerUrl: data.explorerUrl,
        });
        onRefresh();
      } else {
        setActionError(data.error || 'Failed to slash pledge.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(`Slashing error: ${msg}`);
    } finally {
      setIsSlashing(false);
    }
  };

  // Simulate Git Commit (Demo Testing Feature)
  const handleSimulateCommit = async () => {
    try {
      setIsSimulating(true);
      const res = await fetch('/api/github/simulate-commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: pledge.githubUsername,
          repo: `${pledge.githubUsername}/devpledge`,
          message: `feat: ship milestone update #commit-${Date.now().toString().slice(-4)}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await checkGitHub();
      }
    } catch (err) {
      console.error('Failed to simulate commit:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const progressPercent = Math.min(100, Math.round((verifiedCount / pledge.targetCommits) * 100));

  return (
    <div className="clean-card animate-fade-in" style={{ padding: '1.75rem' }}>
      
      {/* Active Escrow Status Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '1.25rem'
      }}>
        
        {/* Left: User Profile & PDA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <img
            src={profile?.avatarUrl || `https://github.com/${pledge.githubUsername}.png`}
            alt={pledge.githubUsername}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '1px solid var(--border-subtle)'
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>@{pledge.githubUsername}</h2>
              <a
                href={`https://github.com/${pledge.githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--text-muted)' }}
              >
                <ExternalLink size={13} />
              </a>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>PDA:</span>
              <span className="mono-text" style={{ color: 'var(--text-secondary)' }}>
                {pledge.address.slice(0, 6)}...{pledge.address.slice(-6)}
              </span>
              <a
                href={`https://explorer.solana.com/address/${pledge.address}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>

        {/* Right: Status Badges */}
        <div>
          {isTargetMet ? (
            <span className="status-pill" style={{ color: 'var(--accent-emerald)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <ShieldCheck size={13} />
              <span>Target Achieved</span>
            </span>
          ) : timeLeft.isExpired ? (
            <span className="status-pill" style={{ color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <AlertTriangle size={13} />
              <span>Deadline Expired</span>
            </span>
          ) : (
            <span className="status-pill">
              <span className="pulse-dot" />
              <span>Escrow Active</span>
            </span>
          )}
        </div>

      </div>

      {/* Two Column Grid: Escrow Stats & Countdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        
        {/* Card 1: Escrowed SOL */}
        <div style={{
          background: 'var(--bg-card-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '1.1rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <span>Locked Escrow</span>
            <Coins size={14} color="var(--text-secondary)" />
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <span className="mono-text" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {pledge.amountSol} SOL
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            100% refundable upon {pledge.targetCommits} commits
          </div>
        </div>

        {/* Card 2: Countdown Timer */}
        <div style={{
          background: 'var(--bg-card-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '1.1rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <span>Time Remaining</span>
            <Clock size={14} color={timeLeft.isExpired ? 'var(--accent-red)' : 'var(--text-secondary)'} />
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            {timeLeft.isExpired ? (
              <span className="mono-text" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-red)' }}>
                EXPIRED
              </span>
            ) : (
              <div className="mono-text" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', gap: '0.25rem' }}>
                <span>{String(timeLeft.hours).padStart(2, '0')}:</span>
                <span>{String(timeLeft.minutes).padStart(2, '0')}:</span>
                <span style={{ color: 'var(--accent-emerald)' }}>{String(timeLeft.seconds).padStart(2, '0')}</span>
              </div>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Deadline: {new Date(pledge.deadline * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

      </div>

      {/* Commit Progress Tracker */}
      <div style={{
        background: 'var(--bg-card-subtle)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        padding: '1.25rem',
        marginBottom: '1.25rem'
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <GitCommit size={16} />
              <span>GitHub Commit Proof Tracker</span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Public commits pushed since escrow creation
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              onClick={checkGitHub}
              disabled={loadingCommits}
              className="btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
              title="Refresh commit status"
            >
              <RefreshCw size={12} className={loadingCommits ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              id="simulate-commit-btn"
              onClick={handleSimulateCommit}
              disabled={isSimulating}
              className="btn-secondary"
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
              title="Simulate pushing a commit"
            >
              {isSimulating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              <span>Simulate Commit</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{verifiedCount}</strong> of {pledge.targetCommits} commits completed
            </span>
            <span className="mono-text" style={{ fontWeight: 600, color: progressPercent >= 100 ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>
              {progressPercent}%
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: progressPercent >= 100 ? 'var(--accent-emerald)' : 'var(--text-primary)',
              borderRadius: '3px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Recent Commits Feed */}
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Verified Commits
          </div>

          {commits.length === 0 ? (
            <div style={{
              padding: '1.25rem',
              textAlign: 'center',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
              fontSize: '0.8rem'
            }}>
              No commits detected yet. Push to GitHub or click <b>&quot;Simulate Commit&quot;</b> to verify.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '150px', overflowY: 'auto' }}>
              {commits.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.78rem',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <span className="mono-text" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-card-subtle)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                      {c.sha}
                    </span>
                    <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.message}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', flexShrink: 0 }}>
                      ({c.repo})
                    </span>
                  </div>

                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--text-secondary)', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Helpful Status Explanation Banner */}
      <div style={{
        padding: '0.75rem 0.9rem',
        borderRadius: 'var(--radius-sm)',
        background: isTargetMet ? 'var(--accent-emerald-subtle)' : timeLeft.isExpired ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-card-subtle)',
        border: `1px solid ${isTargetMet ? 'rgba(16, 185, 129, 0.25)' : timeLeft.isExpired ? 'rgba(239, 68, 68, 0.25)' : 'var(--border-subtle)'}`,
        fontSize: '0.8rem',
        color: isTargetMet ? 'var(--accent-emerald)' : timeLeft.isExpired ? 'var(--accent-red)' : 'var(--text-secondary)',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        {isTargetMet ? (
          <>
            <ShieldCheck size={16} style={{ flexShrink: 0 }} />
            <span>Target achieved! Oracle verified your commit proofs. Click &quot;Claim 100% Refund&quot; below to receive your {pledge.amountSol} SOL.</span>
          </>
        ) : timeLeft.isExpired ? (
          <>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>Deadline expired without achieving the commit goal. Escrow is eligible for slashing to the community treasury.</span>
          </>
        ) : (
          <>
            <Clock size={16} style={{ flexShrink: 0 }} />
            <span>Escrow active: Push {pledge.targetCommits - verifiedCount} more commit{pledge.targetCommits - verifiedCount === 1 ? '' : 's'} before the timer ends to unlock your 100% deposit refund.</span>
          </>
        )}
      </div>

      {/* Action Alerts */}
      {actionError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.7rem 0.85rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--accent-red)',
          fontSize: '0.8rem',
          marginBottom: '1rem'
        }}>
          <AlertTriangle size={15} />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div style={{
          padding: '0.85rem 1rem',
          background: actionSuccess.type === 'settle' ? 'var(--accent-emerald-subtle)' : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${actionSuccess.type === 'settle' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
          borderRadius: 'var(--radius-sm)',
          color: actionSuccess.type === 'settle' ? 'var(--accent-emerald)' : 'var(--accent-amber)',
          fontSize: '0.82rem',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 600 }}>
              {actionSuccess.type === 'settle' ? 'Escrow Settled' : 'Escrow Slashed'}
            </span>
            <a
              href={actionSuccess.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'underline' }}
            >
              <span>Solana Explorer</span>
              <ExternalLink size={11} />
            </a>
          </div>
          <p>{actionSuccess.message}</p>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        
        {/* Settle Escrow (Refund) Button */}
        <button
          id="settle-pledge-btn"
          onClick={handleSettle}
          disabled={isSettling || !isTargetMet}
          className="btn-primary"
          style={{ flex: 1, minWidth: '180px' }}
        >
          {isSettling ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Refunding Deposit...</span>
            </>
          ) : isTargetMet ? (
            <>
              <ShieldCheck size={16} />
              <span>Claim 100% Refund ({pledge.amountSol} SOL)</span>
            </>
          ) : (
            <>
              <ShieldCheck size={16} />
              <span>Verify & Settle Escrow ({verifiedCount}/{pledge.targetCommits})</span>
            </>
          )}
        </button>

        {/* Slash Escrow (Forfeit to Treasury) Button */}
        <button
          id="slash-pledge-btn"
          onClick={handleSlash}
          disabled={isSlashing || !timeLeft.isExpired || isTargetMet}
          className="btn-danger"
          title={timeLeft.isExpired ? 'Slash expired pledge to treasury' : 'Cannot slash until deadline passes'}
        >
          {isSlashing ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>Slashing...</span>
            </>
          ) : (
            <>
              <Flame size={15} />
              <span>Slash to Treasury</span>
            </>
          )}
        </button>

      </div>

    </div>
  );
}
