'use client';

import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  GitBranch, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink
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
  const { publicKey, sendTransaction, signTransaction, connected } = useWallet();

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
      
      // Resilient blockhash retrieval
      let blockhash = '';
      try {
        const rpcRes = await fetch('/api/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getLatestBlockhash',
            params: [{ commitment: 'confirmed' }],
          }),
        });
        const rpcData = await rpcRes.json();
        blockhash = rpcData?.result?.value?.blockhash;
      } catch (e) {
        console.warn('Proxy blockhash fetch warning:', e);
      }

      if (!blockhash) {
        throw new Error('Unable to fetch recent blockhash from network.');
      }

      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

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
          throw new Error(submitData.error || 'Failed to broadcast pledge creation transaction');
        }
        signature = submitData.signature;
      } else {
        throw new Error('Wallet does not support transaction signing.');
      }

      setSuccessTx(signature);
      setIsSubmitting(false);
      onPledgeCreated();
    } catch (err: unknown) {
      console.error('Error creating pledge:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('User rejected')) {
        setErrorMsg('Transaction rejected in wallet.');
      } else if (msg.includes('already in use') || msg.includes('0x0')) {
        setErrorMsg('You already have an active pledge escrow. Settle or wait for expiration before creating another.');
      } else {
        setErrorMsg(`Transaction failed: ${msg}`);
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="clean-card" style={{ padding: '1.75rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.25rem' }}>
          Create Commitment Escrow
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Lock SOL into on-chain escrow. Hit your target commits before the deadline to claim 100% back.
        </p>
      </div>

      <form onSubmit={handleCreatePledge} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Step 1: GitHub Username */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
            GitHub Username
          </label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <GitBranch size={16} />
            </div>
            <input
              id="github-username-input"
              type="text"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="e.g. your-github-handle"
              className="form-input"
              style={{ paddingLeft: '2.4rem' }}
              maxLength={39}
              required
            />
            {profileLoading && (
              <div style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}>
                <Loader2 size={15} className="animate-spin" color="#71717a" />
              </div>
            )}
          </div>

          {/* GitHub User Preview Card */}
          {profile && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginTop: '0.5rem',
              padding: '0.5rem 0.75rem',
              background: '#18181b',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)'
            }}>
              <img
                src={profile.avatarUrl}
                alt={profile.username}
                style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-subtle)' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#ffffff' }}>{profile.name || profile.username}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{profile.username}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.65rem' }}>
                  <span>{profile.publicRepos} public repos</span>
                  <span>{profile.followers} followers</span>
                </div>
              </div>
              <CheckCircle2 size={16} color="#10b981" />
            </div>
          )}

          {profileError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.4rem', color: '#f87171', fontSize: '0.78rem' }}>
              <AlertCircle size={13} />
              <span>{profileError}</span>
            </div>
          )}
        </div>

        {/* Step 2: Target Commits */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Target Commits</label>
            <span style={{ fontSize: '0.78rem', color: '#fafafa', fontWeight: 500 }}>
              {targetCommits} Commits
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
            {COMMIT_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                id={`commit-opt-${c}`}
                onClick={() => setTargetCommits(c)}
                style={{
                  padding: '0.55rem 0.4rem',
                  borderRadius: 'var(--radius-sm)',
                  background: targetCommits === c ? 'var(--text-primary)' : 'var(--bg-card-subtle)',
                  border: `1px solid ${targetCommits === c ? 'var(--text-primary)' : 'var(--border-subtle)'}`,
                  color: targetCommits === c ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  fontWeight: targetCommits === c ? 600 : 400,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Duration */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Duration</label>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 500 }}>
              {DURATION_OPTIONS.find((d) => d.seconds === durationSeconds)?.label}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.4rem' }}>
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d.seconds}
                type="button"
                id={`duration-opt-${d.seconds}`}
                onClick={() => setDurationSeconds(d.seconds)}
                style={{
                  padding: '0.5rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  background: durationSeconds === d.seconds ? 'var(--text-primary)' : 'var(--bg-card-subtle)',
                  border: `1px solid ${durationSeconds === d.seconds ? 'var(--text-primary)' : 'var(--border-subtle)'}`,
                  color: durationSeconds === d.seconds ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  fontWeight: durationSeconds === d.seconds ? 600 : 400,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                {d.label.replace(' (Speedrun Demo)', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Step 4: Stake Amount (SOL) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Stake Amount (SOL)</label>
            <span className="mono-text" style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              {amountSol} SOL
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
            {[0.05, 0.1, 0.25, 0.5, 1.0].map((amt) => (
              <button
                key={amt}
                type="button"
                id={`amount-opt-${amt}`}
                onClick={() => setAmountSol(amt)}
                style={{
                  flex: 1,
                  padding: '0.45rem 0.2rem',
                  borderRadius: 'var(--radius-sm)',
                  background: amountSol === amt ? 'var(--text-primary)' : 'var(--bg-card-subtle)',
                  border: `1px solid ${amountSol === amt ? 'var(--text-primary)' : 'var(--border-subtle)'}`,
                  color: amountSol === amt ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  fontWeight: amountSol === amt ? 600 : 400,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {amt}
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
            placeholder="Custom amount"
            required
          />
        </div>

        {/* Escrow Details */}
        <div style={{
          background: 'var(--bg-card-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.9rem',
          fontSize: '0.78rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>PDA:</span>
            <span className="mono-text" style={{ color: 'var(--text-primary)' }}>
              {pdaAddress ? `${pdaAddress.slice(0, 6)}...${pdaAddress.slice(-6)}` : 'Connect wallet to derive'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Treasury (if slashed):</span>
            <span className="mono-text" style={{ color: '#a1a1aa' }}>
              {treasuryPubkey.slice(0, 6)}...{treasuryPubkey.slice(-4)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem', marginTop: '0.1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Refund Policy:</span>
            <span style={{ color: '#10b981', fontWeight: 500 }}>
              100% ({amountSol} SOL + rent) upon target
            </span>
          </div>
        </div>

        {/* Error / Success Feedback */}
        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.65rem 0.85rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-sm)',
            color: '#f87171',
            fontSize: '0.8rem'
          }}>
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successTx && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            padding: '0.65rem 0.85rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 'var(--radius-sm)',
            color: '#10b981',
            fontSize: '0.8rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <CheckCircle2 size={15} />
              <span>Escrow locked on Devnet</span>
            </div>
            <a
              href={`https://explorer.solana.com/tx/${successTx}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'underline' }}
            >
              <span>View Explorer</span>
              <ExternalLink size={11} />
            </a>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          id="create-pledge-submit-btn"
          disabled={isSubmitting || !connected || !profile}
          className="btn-primary"
          style={{ width: '100%', marginTop: '0.25rem' }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Locking Escrow on Devnet...</span>
            </>
          ) : !connected ? (
            <span>Connect Wallet to Lock Escrow</span>
          ) : !profile ? (
            <span>Verify GitHub Username to Continue</span>
          ) : (
            <span>Lock {amountSol} SOL in Escrow</span>
          )}
        </button>

      </form>
    </div>
  );
}
