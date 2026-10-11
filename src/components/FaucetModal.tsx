'use client';

import React, { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { X, Droplets, ExternalLink, Loader2, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';

interface FaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FaucetModal({ isOpen, onClose }: FaucetModalProps) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [loading, setLoading] = useState(false);
  const [airdropStatus, setAirdropStatus] = useState<{ success?: boolean; message?: string }>({});
  const [copiedCli, setCopiedCli] = useState(false);

  if (!isOpen) return null;

  const handleQuickAirdrop = async () => {
    if (!publicKey) {
      setAirdropStatus({ success: false, message: 'Please connect your Solana wallet first.' });
      return;
    }

    setLoading(true);
    setAirdropStatus({});
    try {
      const sig = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature: sig,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      }, 'confirmed');

      setAirdropStatus({
        success: true,
        message: 'Successfully requested 1 SOL airdrop on Devnet!',
      });
    } catch (err: unknown) {
      console.warn('Airdrop RPC error:', err);
      setAirdropStatus({
        success: false,
        message: 'Public RPC faucet rate-limited. Please use faucet.solana.com or solfaucet.com below.',
      });
    } finally {
      setLoading(false);
    }
  };

  const cliCmd = publicKey ? `solana airdrop 1 ${publicKey.toBase58()} --url devnet` : 'solana airdrop 1 <WALLET_PUBKEY> --url devnet';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '560px',
        padding: '2rem',
        background: 'var(--bg-secondary)',
        border: '1px solid rgba(20, 241, 149, 0.3)'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(20, 241, 149, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(20, 241, 149, 0.4)' }}>
              <Droplets size={20} color="#14f195" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Get Solana Devnet SOL</h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Free testnet tokens to lock in commitment escrow</span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Option 1: One-click in-app airdrop */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          marginBottom: '1rem'
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            1. In-App Quick Airdrop
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
            Attempt an instant 1 SOL devnet faucet request directly to your connected wallet.
          </p>

          <button
            onClick={handleQuickAirdrop}
            disabled={loading || !publicKey}
            className="btn-primary"
            style={{ width: '100%', fontSize: '0.88rem', padding: '0.7rem' }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Requesting Devnet Airdrop...</span>
              </>
            ) : !publicKey ? (
              <span>Connect Wallet to Request</span>
            ) : (
              <>
                <Droplets size={16} />
                <span>Request 1 Devnet SOL</span>
              </>
            )}
          </button>

          {airdropStatus.message && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginTop: '0.75rem',
              fontSize: '0.8rem',
              color: airdropStatus.success ? '#4ade80' : '#f87171'
            }}>
              {airdropStatus.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              <span>{airdropStatus.message}</span>
            </div>
          )}
        </div>

        {/* Option 2: External Web Faucets */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          marginBottom: '1rem'
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            2. High-Capacity Web Faucets
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            When public RPC endpoints are rate-limited, use these reliable web faucets:
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a
              href="https://faucet.solana.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ flex: 1, minWidth: '160px', fontSize: '0.82rem', padding: '0.65rem', justifyContent: 'center' }}
            >
              <span>faucet.solana.com</span>
              <ExternalLink size={12} />
            </a>

            <a
              href="https://solfaucet.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ flex: 1, minWidth: '160px', fontSize: '0.82rem', padding: '0.65rem', justifyContent: 'center' }}
            >
              <span>solfaucet.com</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Option 3: Terminal CLI Command */}
        <div style={{
          background: 'rgba(10, 12, 18, 0.9)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          fontSize: '0.78rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Solana CLI Command:</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(cliCmd);
                setCopiedCli(true);
                setTimeout(() => setCopiedCli(false), 2000);
              }}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
            >
              {copiedCli ? <Check size={13} color="#14f195" /> : <Copy size={13} />}
              <span style={{ fontSize: '0.72rem' }}>Copy</span>
            </button>
          </div>
          <code className="mono-text" style={{ color: '#14f195', wordBreak: 'break-all' }}>
            {cliCmd}
          </code>
        </div>

        {/* Close Button */}
        <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}>
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
