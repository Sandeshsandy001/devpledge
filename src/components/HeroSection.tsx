'use client';

import React, { useState } from 'react';
import { Shield, GitCommit, Clock, Coins, ExternalLink, Copy, Check, Flame } from 'lucide-react';
import { PROGRAM_ID } from '@/lib/solana/constants';

export function HeroSection() {
  const [copied, setCopied] = useState(false);

  const copyProgramId = () => {
    navigator.clipboard.writeText(PROGRAM_ID.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section style={{ padding: '3.5rem 0 2rem', textAlign: 'center' }}>
      <div className="container">
        
        {/* Hackathon banner */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <span className="pill pill-purple" style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}>
            <Flame size={14} color="#c084fc" />
            <span>Colosseum & Superteam Nepal Hackathon Build</span>
          </span>
        </div>

        {/* Hero Title */}
        <h1 style={{
          fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          maxWidth: '900px',
          margin: '0 auto 1.25rem'
        }}>
          Lock SOL. Ship Code.{' '}
          <span className="gradient-text">Or Get Slashed.</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
          color: 'var(--text-secondary)',
          maxWidth: '720px',
          margin: '0 auto 2rem',
          lineHeight: 1.6
        }}>
          A trustless Web3 commitment escrow on Solana. Put your skin in the game: hit your GitHub commit target before the deadline to claim your refund, or forfeit your funds to the community treasury.
        </p>

        {/* Program verification banner */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-full)',
          padding: '0.5rem 1.1rem',
          marginBottom: '3rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Deployed Anchor Program:</span>
          <span className="mono-text" style={{ fontSize: '0.8rem', color: '#14f195', fontWeight: 600 }}>
            {PROGRAM_ID.toBase58().slice(0, 10)}...{PROGRAM_ID.toBase58().slice(-8)}
          </span>
          <button
            onClick={copyProgramId}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.2rem'
            }}
            title="Copy Program ID"
          >
            {copied ? <Check size={14} color="#14f195" /> : <Copy size={14} />}
          </button>
          <a
            href={`https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--solana-purple)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              fontSize: '0.78rem',
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            <span>Solana Explorer</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {/* 4 Feature Pillars */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          textAlign: 'left'
        }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(153, 69, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              border: '1px solid rgba(153, 69, 255, 0.3)'
            }}>
              <Coins size={22} color="#9945ff" />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem' }}>1. Lock SOL Escrow</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Choose your target commits (e.g. 5) & duration. Funds are locked into a trustless PDA owned exclusively by the contract.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(20, 241, 149, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              border: '1px solid rgba(20, 241, 149, 0.3)'
            }}>
              <GitCommit size={22} color="#14f195" />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem' }}>2. Ship on GitHub</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Push commits to any of your public repositories. The GitHub Oracle verifies commit hashes and timestamps in real-time.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(0, 242, 254, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              border: '1px solid rgba(0, 242, 254, 0.3)'
            }}>
              <Shield size={22} color="#00f2fe" />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem' }}>3. 100% Refund</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Hit your target? The Relayer Oracle verifies proof on GitHub, signs <code>settle_pledge</code>, and refunds 100% deposit + rent!
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <Clock size={22} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem' }}>4. Slash on Failure</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              If the deadline expires without enough commits, anyone or the Oracle triggers <code>slash_pledge</code> to forfeit funds to treasury.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
