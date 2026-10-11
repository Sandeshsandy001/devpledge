'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Terminal } from 'lucide-react';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  {
    ssr: false,
    loading: () => <button className="wallet-adapter-button">Connect Wallet</button>,
  }
);

export function Navbar() {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(9, 9, 11, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0.75rem 0'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        
        {/* Brand mark & Devnet indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: '#18181b',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Terminal size={17} color="#fafafa" strokeWidth={2} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.02em', color: '#fafafa' }}>
              DevPledge
            </span>
          </a>

          <div className="status-pill" style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}>
            <span className="pulse-dot" />
            <span>Devnet</span>
          </div>
        </div>

        {/* Right side: Wallet Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div id="wallet-connect-wrapper">
            <WalletMultiButton />
          </div>
        </div>

      </div>
    </header>
  );
}
