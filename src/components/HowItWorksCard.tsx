'use client';

import React, { useState } from 'react';
import { Lock, GitCommit, ShieldCheck, Flame, ExternalLink, Copy, Check } from 'lucide-react';
import { PROGRAM_ID } from '@/lib/solana/constants';

export function HowItWorksCard() {
  const [copied, setCopied] = useState(false);

  const copyProgramId = () => {
    navigator.clipboard.writeText(PROGRAM_ID.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    {
      num: '01',
      icon: <Lock size={16} color="#fafafa" />,
      title: 'Lock Escrow',
      desc: 'Deposit SOL into a trustless PDA escrow derived from your wallet public key.',
    },
    {
      num: '02',
      icon: <GitCommit size={16} color="#fafafa" />,
      title: 'Ship Code',
      desc: 'Push commits to any of your public GitHub repositories within the deadline.',
    },
    {
      num: '03',
      icon: <ShieldCheck size={16} color="#fafafa" />,
      title: 'Oracle Proof',
      desc: 'The relayer oracle validates commit hashes and timestamps against on-chain state.',
    },
    {
      num: '04',
      icon: <Flame size={16} color="#fafafa" />,
      title: 'Refund or Slash',
      desc: 'Hit your commit target to claim 100% of your deposit + rent. Unmet pledges forfeit to the treasury.',
    },
  ];

  return (
    <div className="clean-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.25rem' }}>
          How DevPledge Works
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Autonomous commitment enforcement powered by Solana smart contracts.
        </p>
      </div>

      {/* 4 Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        {steps.map((s) => (
          <div key={s.num} style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: '#18181b',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                <span className="mono-text" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.num}</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fafafa' }}>{s.title}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {s.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Program ID Verification Box */}
      <div style={{
        marginTop: 'auto',
        padding: '1rem',
        borderRadius: 'var(--radius-sm)',
        background: '#18181b',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Program ID (Devnet)
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              onClick={copyProgramId}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.1rem' }}
              title="Copy Program ID"
            >
              {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
            </button>
            <a
              href={`https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
              title="View on Solana Explorer"
            >
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
        <div className="mono-text" style={{ fontSize: '0.78rem', color: '#a1a1aa', wordBreak: 'break-all' }}>
          {PROGRAM_ID.toBase58()}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
          PDA Derivation: <code>[&quot;pledge&quot;, wallet_pubkey]</code>
        </div>
      </div>
    </div>
  );
}
