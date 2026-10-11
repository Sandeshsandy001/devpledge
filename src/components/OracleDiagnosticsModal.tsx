'use client';

import React, { useState, useEffect } from 'react';
import { X, Shield, Terminal, Copy, Check, ExternalLink, Code2, Cpu } from 'lucide-react';
import { 
  PROGRAM_ID, 
  DEVNET_RPC_URL, 
  DEFAULT_TREASURY_PUBKEY,
  CREATE_PLEDGE_DISCRIMINATOR,
  SETTLE_PLEDGE_DISCRIMINATOR,
  SLASH_PLEDGE_DISCRIMINATOR,
  PLEDGE_ACCOUNT_DISCRIMINATOR
} from '@/lib/solana/constants';

interface OracleDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OracleDiagnosticsModal({ isOpen, onClose }: OracleDiagnosticsModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [oracleInfo, setOracleInfo] = useState<{
    oraclePublicKey?: string;
    oracleBalanceSol?: number;
    status?: string;
  }>({});

  useEffect(() => {
    if (isOpen) {
      fetch('/api/oracle/info')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setOracleInfo(data);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const idlJson = {
    address: PROGRAM_ID.toBase58(),
    metadata: {
      name: "devpledge",
      version: "0.1.0",
      spec: "0.1.0",
      target: "Colosseum / Superteam Nepal"
    },
    instructions: [
      {
        name: "create_pledge",
        discriminator: Array.from(CREATE_PLEDGE_DISCRIMINATOR),
        accounts: [
          { name: "pledge", writable: true, pda: ["pledge", "user"] },
          { name: "user", writable: true, signer: true },
          { name: "authority", writable: false, signer: false },
          { name: "treasury", writable: false, signer: false },
          { name: "system_program", address: "11111111111111111111111111111111" }
        ],
        args: [
          { name: "amount", type: "u64" },
          { name: "github_username", type: "string" },
          { name: "duration_seconds", type: "i64" },
          { name: "target_commits", type: "u8" }
        ]
      },
      {
        name: "settle_pledge",
        discriminator: Array.from(SETTLE_PLEDGE_DISCRIMINATOR),
        accounts: [
          { name: "pledge", writable: true },
          { name: "user", writable: true },
          { name: "authority", writable: true, signer: true }
        ],
        args: []
      },
      {
        name: "slash_pledge",
        discriminator: Array.from(SLASH_PLEDGE_DISCRIMINATOR),
        accounts: [
          { name: "pledge", writable: true },
          { name: "treasury", writable: true }
        ],
        args: []
      }
    ],
    accounts: [
      {
        name: "Pledge",
        discriminator: Array.from(PLEDGE_ACCOUNT_DISCRIMINATOR),
        space: 205,
        fields: ["user: Pubkey", "authority: Pubkey", "treasury: Pubkey", "amount: u64", "github_username: String", "start_time: i64", "deadline: i64", "target_commits: u8", "bump: u8"]
      }
    ]
  };

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
        maxWidth: '720px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2rem',
        background: 'var(--bg-secondary)',
        border: '1px solid rgba(153, 69, 255, 0.3)'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(153, 69, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(153, 69, 255, 0.4)' }}>
              <Cpu size={20} color="#9945ff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Smart Contract & Architecture Diagnostics</h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Solana Devnet Anchor Escrow & Relayer Oracle</span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Spec Overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem', fontSize: '0.85rem' }}>
          
          {/* Program ID */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Deployed Program ID:</span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={() => copyToClipboard('program', PROGRAM_ID.toBase58())}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  title="Copy"
                >
                  {copiedKey === 'program' ? <Check size={14} color="#14f195" /> : <Copy size={14} />}
                </button>
                <a
                  href={`https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--solana-green)', display: 'flex', alignItems: 'center' }}
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
            <div className="mono-text" style={{ color: '#14f195', wordBreak: 'break-all', fontWeight: 600 }}>
              {PROGRAM_ID.toBase58()}
            </div>
          </div>

          {/* Oracle Relayer Authority */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Oracle Relayer Authority Keypair:</span>
              {oracleInfo.oraclePublicKey && (
                <button
                  onClick={() => copyToClipboard('oracle', oracleInfo.oraclePublicKey!)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  title="Copy"
                >
                  {copiedKey === 'oracle' ? <Check size={14} color="#14f195" /> : <Copy size={14} />}
                </button>
              )}
            </div>
            <div className="mono-text" style={{ color: '#9945ff', wordBreak: 'break-all', fontWeight: 600 }}>
              {oracleInfo.oraclePublicKey || 'Loading...'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Oracle Balance: {oracleInfo.oracleBalanceSol ?? 0} SOL (pays gas for signing <code>settle_pledge</code> refunds)
            </div>
          </div>

          {/* Treasury Pubkey */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Community Treasury (Forfeiture Destination):</span>
              <button
                onClick={() => copyToClipboard('treasury', DEFAULT_TREASURY_PUBKEY.toBase58())}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                title="Copy"
              >
                {copiedKey === 'treasury' ? <Check size={14} color="#14f195" /> : <Copy size={14} />}
              </button>
            </div>
            <div className="mono-text" style={{ color: '#f59e0b', wordBreak: 'break-all', fontWeight: 600 }}>
              {DEFAULT_TREASURY_PUBKEY.toBase58()}
            </div>
          </div>

        </div>

        {/* Anchor IDL Code Block */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Code2 size={15} color="#00f2fe" />
              <span>Anchor Smart Contract IDL Spec</span>
            </span>
            <button
              onClick={() => copyToClipboard('idl', JSON.stringify(idlJson, null, 2))}
              className="btn-secondary"
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
            >
              {copiedKey === 'idl' ? <Check size={12} color="#14f195" /> : <Copy size={12} />}
              <span>Copy IDL</span>
            </button>
          </div>

          <pre className="mono-text" style={{
            background: 'rgba(10, 12, 18, 0.95)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            fontSize: '0.74rem',
            color: '#a5f3fc',
            maxHeight: '220px',
            overflowY: 'auto'
          }}>
            {JSON.stringify(idlJson, null, 2)}
          </pre>
        </div>

        {/* Close Button */}
        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '0.6rem 1.4rem' }}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
