'use client';

import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  Lock, 
  GitCommit, 
  Clock, 
  Coins, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  GitBranch,
  Sparkles
} from 'lucide-react';
import { 
  DEFAULT_TREASURY_PUBKEY, 
  COMMIT_OPTIONS, 
  DURATION_OPTIONS 
} from '@/lib/solana/constants';
import { derivePledgePda } from '@/lib/solana/account';
import { createPledgeInstruction } from '@/lib/solana/instructions';
import { GitHubProfile } from '@/lib/github/githubService';

interface CreatePledgeCardProps {
  onPledgeCreated: () => void;
}

export function CreatePledgeCard({ onPledgeCreated }: CreatePledgeCardProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [githubUsername, setGithubUsername] = useState('Sandeshsandy001');
  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [targetCommits, setTargetCommits] = useState(5);
  const [durationSeconds, setDurationSeconds] = useState(86400); // 24 hours
  const [amountSol, setAmountSol] = useState(0.1);

  const [oracleAuthority, setOracleAuthority] = useState<string>('');
  const [treasuryPubkey, setTreasuryPubkey] = useState<string>(DEFAULT_TREASURY_PUBKEY.toBase58());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successTx, setSuccessTx] = useState('');

  // Fetch Oracle info
  useEffect(() => {
    fetch('/api/oracle/info')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOracleAuthority(data.oraclePublicKey);
          if (data.treasuryPublicKey) setTreasuryPubkey(data.treasuryPublicKey);
        }
      })
      .catch((err) => console.error('Failed fetching oracle info:', err));
  }, []);

  // Fetch GitHub profile with debounce
  useEffect(() => {
    if (!githubUsername.trim()) {
      setProfile(null);
      setProfileError('');
      return;
    }

    const timer = setTimeout(async () => {
      setProfileLoading(true);
      setProfileError('');
      try {
        const res = await fetch(`/api/github/verify?username=${encodeURIComponent(githubUsername.trim())}`);
        const data = await res.json();
        if (data.success && data.profile) {
          setProfile(data.profile);
        } else {
          setProfile(null);
          setProfileError(data.error || 'GitHub user not found');
        }
      } catch {
        setProfileError('Failed to verify GitHub user');
      } finally {
        setProfileLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [githubUsername]);

  const pdaAddress = publicKey ? derivePledgePda(publicKey)[0].toBase58() : null;

  const handleCreatePledge = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessTx('');

    if (!connected || !publicKey) {
      setErrorMsg('Please connect your Solana wallet first.');
      return;
    }

    if (!githubUsername.trim()) {
      setErrorMsg('GitHub username is required.');
      return;
    }

    if (githubUsername.trim().length > 39) {
      setErrorMsg('GitHub username must be 39 characters or fewer.');
      return;
    }

    if (!oracleAuthority) {
      setErrorMsg('Oracle authority key not loaded. Check oracle relayer service.');
      return;
    }

    if (amountSol <= 0) {
      setErrorMsg('Escrow deposit must be greater than 0 SOL.');
      return;
    }

    try {
      setIsSubmitting(true);

      const authorityPk = new PublicKey(oracleAuthority);
      const treasuryPk = new PublicKey(treasuryPubkey);
      const amountLamports = BigInt(Math.round(amountSol * LAMPORTS_PER_SOL));

      // Build instruction
      const ix = createPledgeInstruction({
        user: publicKey,
        authority: authorityPk,
        treasury: treasuryPk,
        amountLamports,
        githubUsername: githubUsername.trim(),
        durationSeconds,
        targetCommits,
      });

      const tx = new Transaction().add(ix);
      const signature = await sendTransaction(tx, connection);

      // Confirm transaction
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        'confirmed'
      );

      setSuccessTx(signature);
      setIsSubmitting(false);
      onPledgeCreated();
    } catch (err: unknown) {
      console.error('Error creating pledge:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('User rejected')) {
        setErrorMsg('Transaction rejected in wallet.');
      } else if (msg.includes('already in use') || msg.includes('0x0')) {
        setErrorMsg('You already have an active pledge escrow! Settle or wait for expiration before creating another.');
      } else {
        setErrorMsg(`Transaction failed: ${msg}`);
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel glass-panel-highlight" style={{ padding: '2rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={22} color="#14f195" />
            <span>Create New Commitment Escrow</span>
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Lock your SOL deposit. Hit your commit goal to get refunded 100%.
          </p>
        </div>

        <span className="pill pill-green" style={{ fontSize: '0.78rem' }}>
          <Sparkles size={12} />
          <span>Trustless Escrow PDA</span>
        </span>
      </div>

      <form onSubmit={handleCreatePledge} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Step 1: GitHub Username */}
        <div>
          <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            1. GitHub Username
          </label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <GitBranch size={18} />
            </div>
            <input
              id="github-username-input"
              type="text"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="e.g. torvalds or your-handle"
              className="form-input"
              style={{ paddingLeft: '2.75rem' }}
              maxLength={39}
              required
            />
            {profileLoading && (
              <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }}>
                <Loader2 size={16} className="animate-spin" color="#9945ff" />
              </div>
            )}
          </div>

          {/* GitHub User Preview Card */}
          {profile && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              marginTop: '0.65rem',
              padding: '0.65rem 0.9rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(20, 241, 149, 0.2)'
            }}>
              <img
                src={profile.avatarUrl}
                alt={profile.username}
                style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid var(--border-subtle)' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{profile.name || profile.username}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{profile.username}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.75rem' }}>
                  <span>{profile.publicRepos} public repos</span>
                  <span>{profile.followers} followers</span>
                </div>
              </div>
              <CheckCircle2 size={18} color="#14f195" />
            </div>
          )}

          {profileError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', color: '#f87171', fontSize: '0.8rem' }}>
              <AlertCircle size={14} />
              <span>{profileError}</span>
            </div>
          )}
        </div>

        {/* Step 2: Target Commits */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600 }}>2. Target Commits</label>
            <span style={{ fontSize: '0.8rem', color: 'var(--solana-green)', fontWeight: 600 }}>
              {targetCommits} Commits required
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(75px, 1fr))', gap: '0.5rem' }}>
            {COMMIT_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                id={`commit-opt-${c}`}
                onClick={() => setTargetCommits(c)}
                style={{
                  padding: '0.65rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  background: targetCommits === c ? 'rgba(20, 241, 149, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${targetCommits === c ? 'var(--solana-green)' : 'var(--border-subtle)'}`,
                  color: targetCommits === c ? '#fff' : 'var(--text-secondary)',
                  fontWeight: targetCommits === c ? 700 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {c} Commits
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Duration */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600 }}>3. Commitment Duration</label>
            <span style={{ fontSize: '0.8rem', color: 'var(--solana-purple)', fontWeight: 600 }}>
              {DURATION_OPTIONS.find((d) => d.seconds === durationSeconds)?.label || `${durationSeconds}s`}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d.seconds}
                type="button"
                id={`duration-opt-${d.seconds}`}
                onClick={() => setDurationSeconds(d.seconds)}
                style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: durationSeconds === d.seconds ? 'rgba(153, 69, 255, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${durationSeconds === d.seconds ? 'var(--solana-purple)' : 'var(--border-subtle)'}`,
                  color: durationSeconds === d.seconds ? '#fff' : 'var(--text-secondary)',
                  fontWeight: durationSeconds === d.seconds ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 4: Deposit Amount */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600 }}>4. SOL Escrow Deposit</label>
            <span className="mono-text" style={{ fontSize: '0.85rem', color: '#14f195', fontWeight: 700 }}>
              {amountSol} SOL
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {[0.05, 0.1, 0.25, 0.5, 1.0].map((amt) => (
              <button
                key={amt}
                type="button"
                id={`amount-opt-${amt}`}
                onClick={() => setAmountSol(amt)}
                style={{
                  flex: 1,
                  padding: '0.55rem 0.25rem',
                  borderRadius: 'var(--radius-sm)',
                  background: amountSol === amt ? 'rgba(20, 241, 149, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${amountSol === amt ? 'var(--solana-green)' : 'var(--border-subtle)'}`,
                  color: amountSol === amt ? '#fff' : 'var(--text-secondary)',
                  fontWeight: amountSol === amt ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {amt} SOL
              </button>
            ))}
          </div>

          <input
            id="amount-sol-input"
            type="number"
            step="0.01"
            min="0.01"
            value={amountSol}
            onChange={(e) => setAmountSol(parseFloat(e.target.value) || 0)}
            className="form-input"
            placeholder="Custom SOL amount"
            required
          />
        </div>

        {/* Summary Box */}
        <div style={{
          background: 'rgba(13, 16, 26, 0.7)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          fontSize: '0.82rem'
        }}>
          <div style={{ fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>Escrow Contract Summary</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Pledge PDA Address:</span>
              <span className="mono-text" style={{ color: '#14f195' }}>
                {pdaAddress ? `${pdaAddress.slice(0, 8)}...${pdaAddress.slice(-6)}` : 'Connect wallet to derive'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Oracle Relayer Authority:</span>
              <span className="mono-text" style={{ color: '#9945ff' }}>
                {oracleAuthority ? `${oracleAuthority.slice(0, 8)}...${oracleAuthority.slice(-6)}` : 'Loading oracle...'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Slashing Destination:</span>
              <span className="mono-text" style={{ color: '#f59e0b' }}>
                {treasuryPubkey.slice(0, 8)}...{treasuryPubkey.slice(-6)} (Community Treasury)
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontWeight: 600 }}>Refund Terms:</span>
              <span style={{ color: '#4ade80', fontWeight: 600 }}>
                100% deposit ({amountSol} SOL) refunded on target
              </span>
            </div>
          </div>
        </div>

        {/* Error / Success Feedback */}
        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-sm)',
            color: '#f87171',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successTx && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: 'rgba(20, 241, 149, 0.12)',
            border: '1px solid rgba(20, 241, 149, 0.35)',
            borderRadius: 'var(--radius-sm)',
            color: '#4ade80',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} />
              <span>Escrow locked on Devnet!</span>
            </div>
            <a
              href={`https://explorer.solana.com/tx/${successTx}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#14f195', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
            >
              <span>View Explorer</span>
              <ExternalLink size={12} />
            </a>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          id="create-pledge-submit-btn"
          disabled={isSubmitting || !connected || !profile}
          className="btn-primary"
          style={{ width: '100%', padding: '0.95rem' }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Signing & Locking Escrow on Devnet...</span>
            </>
          ) : !connected ? (
            <span>Connect Wallet to Lock Escrow</span>
          ) : !profile ? (
            <span>Verify GitHub Username to Continue</span>
          ) : (
            <>
              <Lock size={18} />
              <span>Lock {amountSol} SOL in Escrow</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
}
