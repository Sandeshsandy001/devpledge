'use client';

import React from 'react';
import { ShieldCheck, GitCommit, CheckCircle2 } from 'lucide-react';

export function HeroSection() {
  return (
    <section style={{ padding: '2.5rem 0 1.5rem', textAlign: 'left' }}>
      <div className="container">
        <h1
          style={{
            fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            marginBottom: '0.75rem',
            transition: 'color 0.2s ease',
          }}
        >
          Commit funds. Ship code. Get refunded.
        </h1>
        <p
          style={{
            fontSize: '1rem',
            color: 'var(--text-secondary)',
            maxWidth: '720px',
            lineHeight: 1.6,
            marginBottom: '1.25rem',
          }}
        >
          Non-custodial commitment escrow on Solana. Lock SOL into an on-chain program to guarantee your GitHub shipping velocity. Hit your commit goal before the deadline to claim 100% of your deposit back.
        </p>

        {/* Feature Highlights Pills */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
          <div className="status-pill" style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}>
            <ShieldCheck size={13} color="var(--accent-emerald)" />
            <span>Trustless Anchor Escrow</span>
          </div>
          <div className="status-pill" style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}>
            <GitCommit size={13} color="var(--accent-emerald)" />
            <span>Verified GitHub Commits</span>
          </div>
          <div className="status-pill" style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}>
            <CheckCircle2 size={13} color="var(--accent-emerald)" />
            <span>100% Refund + Rent on Success</span>
          </div>
        </div>
      </div>
    </section>
  );
}
