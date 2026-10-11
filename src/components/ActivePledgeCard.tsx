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
  CheckCircle2, 
  ExternalLink, 
  Loader2, 
  RefreshCw, 
  Flame, 
  Plus,
  Terminal,
  Award
} from 'lucide-react';
import { PledgeAccountData } from '@/lib/solana/account';
import { CommitItem, GitHubProfile } from '@/lib/github/githubService';

interface ActivePledgeCardProps {
  pledge: PledgeAccountData;
  onRefresh: () => void;
}

export function ActivePledgeCard({ pledge, onRefresh }: ActivePledgeCardProps) {
  const { connection } = useConnection();
  const { sendTransaction } = useWallet();

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
    const interval = setInterval(checkGitHub, 12000);
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
          const signature = await sendTransaction(tx, connection);
          const latest = await connection.getLatestBlockhash();
          await connection.confirmTransaction(
            {
              signature,
              blockhash: latest.blockhash,
              lastValidBlockHeight: latest.lastValidBlockHeight,
            },
            'confirmed'
          );

          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#9945FF', '#14F195', '#00F2FE', '#FFD700'],
          });
          setActionSuccess({
            type: 'settle',
            signature,
            message: `100% deposit (${pledge.amountSol} SOL) refunded to your wallet!`,
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
          });
          onRefresh();
          return;
        }

        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#9945FF', '#14F195', '#00F2FE', '#FFD700'],
        });
        setActionSuccess({
          type: 'settle',
          signature: data.signature,
          message: data.message || `100% deposit (${pledge.amountSol} SOL) refunded to your wallet!`,
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

  // Simulate Git Commit (Demo Speedrun Feature)
  const handleSimulateCommit = async () => {
    try {
      setIsSimulating(true);
      const res = await fetch('/api/github/simulate-commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: pledge.githubUsername,
          repo: `${pledge.githubUsername}/solana-hackathon`,
          message: `feat(core): implement anchor escrow #commit-${Date.now().toString().slice(-4)}`,
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
    <div className="glass-panel glass-panel-highlight animate-fade-in" style={{ padding: '2rem' }}>
      
      {/* Active Escrow Status Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.75rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '1.25rem'
      }}>
        
        {/* Left: User Profile & PDA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img
            src={profile?.avatarUrl || `https://github.com/${pledge.githubUsername}.png`}
            alt={pledge.githubUsername}
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              border: '2px solid var(--solana-green)',
              boxShadow: 'var(--shadow-neon)'
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>@{pledge.githubUsername}</h2>
              <a
                href={`https://github.com/${pledge.githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--text-muted)' }}
              >
                <ExternalLink size={14} />
              </a>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>PDA:</span>
              <span className="mono-text" style={{ color: 'var(--solana-purple)' }}>
                {pledge.address.slice(0, 6)}...{pledge.address.slice(-6)}
              </span>
              <a
                href={`https://explorer.solana.com/address/${pledge.address}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--solana-purple)' }}
              >
                <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>

        {/* Right: Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {isTargetMet ? (
            <span className="pill pill-green" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>
              <ShieldCheck size={14} />
              <span>Target Achieved: Ready to Settle!</span>
            </span>
          ) : timeLeft.isExpired ? (
            <span className="pill pill-red" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>
              <AlertTriangle size={14} />
              <span>Deadline Expired (Subject to Slash)</span>
            </span>
          ) : (
            <span className="pill pill-purple" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>
              <Clock size={14} />
              <span>Escrow Active</span>
            </span>
          )}
        </div>

      </div>

      {/* Two Column Grid: Escrow Stats & Countdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.75rem'
      }}>
        
        {/* Card 1: Escrowed SOL */}
        <div style={{
          background: 'rgba(13, 16, 26, 0.7)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            <span>LOCKED ESCROW DEPOSIT</span>
            <Coins size={16} color="#14f195" />
          </div>
          <div style={{ margin: '0.75rem 0' }}>
            <span className="mono-text" style={{ fontSize: '2rem', fontWeight: 800, color: '#14f195' }}>
              {pledge.amountSol} SOL
            </span>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              ≈ Devnet commitment pledge
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={13} />
            <span>100% refundable upon {pledge.targetCommits} verified commits</span>
          </div>
        </div>

        {/* Card 2: Countdown Timer */}
        <div style={{
          background: 'rgba(13, 16, 26, 0.7)',
          border: `1px solid ${timeLeft.isExpired ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            <span>TIME REMAINING BEFORE SLASH</span>
            <Clock size={16} color={timeLeft.isExpired ? '#ef4444' : '#9945ff'} />
          </div>
          <div style={{ margin: '0.75rem 0' }}>
            {timeLeft.isExpired ? (
              <span className="mono-text" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f87171' }}>
                EXPIRED
              </span>
            ) : (
              <div className="mono-text" style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', display: 'flex', gap: '0.3rem', alignItems: 'baseline' }}>
                <span>{String(timeLeft.hours).padStart(2, '0')}:</span>
                <span>{String(timeLeft.minutes).padStart(2, '0')}:</span>
                <span style={{ color: 'var(--solana-green)' }}>{String(timeLeft.seconds).padStart(2, '0')}</span>
              </div>
            )}
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Deadline: {new Date(pledge.deadline * 1000).toLocaleTimeString()} ({new Date(pledge.deadline * 1000).toLocaleDateString()})
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: timeLeft.isExpired ? '#f87171' : 'var(--text-muted)' }}>
            {timeLeft.isExpired ? 'Unmet escrow is eligible for slashing to community treasury' : 'Automated relayer verification active'}
          </div>
        </div>

      </div>

      {/* Commit Progress Tracker */}
      <div style={{
        background: 'rgba(13, 16, 26, 0.7)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '1.5rem',
        marginBottom: '1.75rem'
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <GitCommit size={18} color="#14f195" />
              <span>GitHub Commit Proof Tracker</span>
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Tracking public commits pushed since pledge creation ({new Date(pledge.startTime * 1000).toLocaleTimeString()})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={checkGitHub}
              disabled={loadingCommits}
              className="btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
              title="Refresh commit status"
            >
              <RefreshCw size={13} className={loadingCommits ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            {/* Quick Commit Simulator Button */}
            <button
              id="simulate-commit-btn"
              onClick={handleSimulateCommit}
              disabled={isSimulating}
              className="btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: 'rgba(20, 241, 149, 0.1)', borderColor: 'rgba(20, 241, 149, 0.3)' }}
              title="Simulate pushing a commit to test escrow fast"
            >
              {isSimulating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} color="#14f195" />}
              <span>Simulate Commit (Demo)</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            <span style={{ fontWeight: 600 }}>
              Progress: <span style={{ color: '#14f195' }}>{verifiedCount}</span> of <span style={{ color: 'var(--text-muted)' }}>{pledge.targetCommits} commits</span>
            </span>
            <span className="mono-text" style={{ fontWeight: 700, color: progressPercent >= 100 ? '#14f195' : 'var(--text-primary)' }}>
              {progressPercent}%
            </span>
          </div>
          <div style={{ width: '100%', height: '10px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: progressPercent >= 100 ? 'var(--solana-gradient)' : 'linear-gradient(90deg, #9945ff, #00f2fe)',
              borderRadius: '5px',
              transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 0 10px rgba(20, 241, 149, 0.4)'
            }} />
          </div>
        </div>

        {/* Recent Commits List */}
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
            VERIFIED COMMITS FEED:
          </div>

          {commits.length === 0 ? (
            <div style={{
              padding: '1.5rem',
              textAlign: 'center',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
              fontSize: '0.85rem'
            }}>
              No public commits registered on GitHub since escrow started yet.
              <br />
              <span style={{ color: 'var(--text-secondary)' }}>
                Push code to GitHub or click <b>"Simulate Commit (Demo)"</b> above to verify your progress!
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
              {commits.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.8rem',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                    <span className="pill pill-purple mono-text" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                      {c.sha}
                    </span>
                    <span style={{ fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.message}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0 }}>
                      ({c.repo})
                    </span>
                  </div>

                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--solana-green)', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Action Feedback Alerts */}
      {actionError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.85rem 1rem',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--radius-sm)',
          color: '#f87171',
          fontSize: '0.85rem',
          marginBottom: '1.25rem'
        }}>
          <AlertTriangle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div style={{
          padding: '1rem',
          background: actionSuccess.type === 'settle' ? 'rgba(20, 241, 149, 0.12)' : 'rgba(245, 158, 11, 0.12)',
          border: `1px solid ${actionSuccess.type === 'settle' ? 'rgba(20, 241, 149, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
          borderRadius: 'var(--radius-sm)',
          color: actionSuccess.type === 'settle' ? '#4ade80' : '#fbbf24',
          fontSize: '0.88rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{ fontWeight: 700 }}>
              {actionSuccess.type === 'settle' ? '🎉 Escrow Successfully Settled!' : '⚡ Escrow Slashed'}
            </span>
            <a
              href={actionSuccess.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'underline' }}
            >
              <span>View On Solana Explorer</span>
              <ExternalLink size={13} />
            </a>
          </div>
          <p>{actionSuccess.message}</p>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        
        {/* Settle Escrow (Refund) Button */}
        <button
          id="settle-pledge-btn"
          onClick={handleSettle}
          disabled={isSettling || !isTargetMet}
          className="btn-primary"
          style={{ flex: 1, minWidth: '200px', padding: '0.95rem' }}
        >
          {isSettling ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Oracle Verifying & Refunding 100% SOL...</span>
            </>
          ) : isTargetMet ? (
            <>
              <Award size={18} />
              <span>Claim 100% Refund ({pledge.amountSol} SOL)</span>
            </>
          ) : (
            <>
              <ShieldCheck size={18} />
              <span>Verify & Settle Escrow ({verifiedCount}/{pledge.targetCommits} Commits)</span>
            </>
          )}
        </button>

        {/* Slash Escrow (Forfeit to Treasury) Button */}
        <button
          id="slash-pledge-btn"
          onClick={handleSlash}
          disabled={isSlashing || !timeLeft.isExpired || isTargetMet}
          className="btn-danger"
          style={{ padding: '0.95rem 1.4rem' }}
          title={timeLeft.isExpired ? 'Slash expired pledge to treasury' : 'Cannot slash until deadline passes'}
        >
          {isSlashing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Slashing to Treasury...</span>
            </>
          ) : (
            <>
              <Flame size={16} />
              <span>Slash to Treasury</span>
            </>
          )}
        </button>

      </div>

    </div>
  );
}
