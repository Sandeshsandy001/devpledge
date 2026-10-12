'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Terminal, Coins, Droplets } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { FaucetModal } from './FaucetModal';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  {
    ssr: false,
    loading: () => <button className="wallet-adapter-button">Connect Wallet</button>,
  }
);

export function Navbar() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [balance, setBalance] = useState<number | null>(null);
  const [isFaucetOpen, setIsFaucetOpen] = useState(false);

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        const bal = await connection.getBalance(publicKey);
        setBalance(bal / LAMPORTS_PER_SOL);
      } catch (err) {
        console.warn('Failed to fetch wallet balance:', err);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 12000);
    return () => clearInterval(interval);
  }, [connection, publicKey]);

  return (
    <>
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--header-bg)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          padding: '0.75rem 0',
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Brand mark & Network indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <a
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                <img src="/logo.svg" alt="DevPledge Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary)',
                }}
              >
                DevPledge
              </span>
            </a>

            <div className="status-pill" style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}>
              <span className="pulse-dot" />
              <span>Devnet</span>
            </div>
          </div>

          {/* Right side: Balance, Faucet, Theme Toggle & Wallet Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Live Wallet Balance Pill (when connected) */}
            {publicKey && (
              <div
                className="status-pill mono-text"
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.7rem',
                }}
                title="Your Devnet SOL balance"
              >
                <Coins size={13} color="var(--accent-emerald)" />
                <span>{balance !== null ? `${balance.toFixed(2)} SOL` : '...'}</span>
              </div>
            )}

            {/* Quick Devnet Faucet trigger */}
            <button
              onClick={() => setIsFaucetOpen(true)}
              className="btn-secondary"
              style={{
                height: '36px',
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '0 0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
              title="Request free Devnet SOL"
            >
              <Droplets size={14} color="var(--accent-emerald)" />
              <span className="hidden-xs">Faucet</span>
            </button>

            {/* Theme Toggle (Dark / Light) */}
            <ThemeToggle />

            {/* Wallet Multi Button */}
            <div id="wallet-connect-wrapper">
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </header>

      {/* Faucet Modal */}
      <FaucetModal isOpen={isFaucetOpen} onClose={() => setIsFaucetOpen(false)} />
    </>
  );
}
