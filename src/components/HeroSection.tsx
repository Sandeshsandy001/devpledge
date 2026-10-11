'use client';

import React from 'react';

export function HeroSection() {
  return (
    <section style={{ padding: '2.5rem 0 1.5rem', textAlign: 'left' }}>
      <div className="container">
        <h1 style={{
          fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          color: '#ffffff',
          marginBottom: '0.75rem'
        }}>
          Commit funds. Ship code. Get refunded.
        </h1>
        <p style={{
          fontSize: '1rem',
          color: 'var(--text-secondary)',
          maxWidth: '680px',
          lineHeight: 1.6
        }}>
          Non-custodial commitment escrow on Solana. Lock SOL into an on-chain program to guarantee your GitHub shipping velocity. Hit your commit goal before the deadline to claim 100% of your deposit back.
        </p>
      </div>
    </section>
  );
}
