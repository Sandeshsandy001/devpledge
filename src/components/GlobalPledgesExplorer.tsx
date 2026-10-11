'use client';

import React, { useState, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { 
  Globe, 
  Search, 
  ExternalLink, 
  Clock, 
  Coins, 
  GitCommit, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  User
} from 'lucide-react';
import { PledgeAccountData } from '@/lib/solana/account';

interface GlobalPledgesExplorerProps {
  onSelectUser?: (userAddress: string) => void;
}

export function GlobalPledgesExplorer({ onSelectUser }: GlobalPledgesExplorerProps) {
  const [pledges, setPledges] = useState<PledgeAccountData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadPledges = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/pledges');
      const data = await res.json();
      if (data.success && Array.isArray(data.pledges)) {
        setPledges(data.pledges);
      }
    } catch (err) {
      console.error('Failed to load global pledges:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPledges();
    const interval = setInterval(loadPledges, 25000);
    return () => clearInterval(interval);
  }, []);

  const filtered = pledges.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.githubUsername.toLowerCase().includes(q) ||
      p.user.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q)
    );
  });

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      
      {/* Header & Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={20} color="#14f195" />
            <span>Community Escrow Explorer</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Real-time feed of active developer commitment escrows on Solana Devnet.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search user or GitHub..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.4rem', paddingRight: '0.75rem', fontSize: '0.82rem', height: '38px' }}
            />
          </div>

          <button
            onClick={loadPledges}
            disabled={isLoading}
            className="btn-secondary"
            style={{ padding: '0.45rem 0.85rem', height: '38px', fontSize: '0.82rem' }}
            title="Refresh Devnet pledges"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

      </div>

      {/* Pledges List / Table */}
      {isLoading && pledges.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem', display: 'block', color: 'var(--solana-purple)' }} />
          <span>Querying Solana Devnet program accounts...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: '2.5rem',
          textAlign: 'center',
          border: '1px dashed var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-muted)',
          fontSize: '0.9rem'
        }}>
          {searchQuery ? 'No commitments match your search.' : 'No active commitments on Devnet yet. Be the first developer to pledge!'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filtered.map((p) => {
            const now = Math.floor(Date.now() / 1000);
            const isExpired = now >= p.deadline;
            const diff = p.deadline - now;
            const hoursLeft = Math.max(0, Math.floor(diff / 3600));
            const minsLeft = Math.max(0, Math.floor((diff % 3600) / 60));

            return (
              <div
                key={p.address}
                style={{
                  background: 'rgba(13, 16, 26, 0.75)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  transition: 'all 0.2s ease'
                }}
              >
                
                {/* Header: User & Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <img
                      src={`https://github.com/${p.githubUsername}.png`}
                      alt={p.githubUsername}
                      style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--border-subtle)' }}
                    />
                    <div>
                      <a
                        href={`https://github.com/${p.githubUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f8fafc', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <span>@{p.githubUsername}</span>
                        <ExternalLink size={12} color="var(--text-muted)" />
                      </a>
                      <div className="mono-text" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {p.user.slice(0, 5)}...{p.user.slice(-4)}
                      </div>
                    </div>
                  </div>

                  {isExpired ? (
                    <span className="pill pill-red" style={{ fontSize: '0.7rem' }}>
                      <AlertTriangle size={11} />
                      <span>Expired</span>
                    </span>
                  ) : (
                    <span className="pill pill-green" style={{ fontSize: '0.7rem' }}>
                      <Clock size={11} />
                      <span>{hoursLeft}h {minsLeft}m left</span>
                    </span>
                  )}
                </div>

                {/* Details Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem',
                  fontSize: '0.8rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>LOCKED ESCROW</span>
                    <span className="mono-text" style={{ fontWeight: 700, color: '#14f195' }}>
                      {p.amountSol} SOL
                    </span>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>TARGET COMMITS</span>
                    <span style={{ fontWeight: 700, color: '#f8fafc' }}>
                      {p.targetCommits} Commits
                    </span>
                  </div>
                </div>

                {/* Footer link to Solana Explorer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>PDA: {p.address.slice(0, 6)}...{p.address.slice(-4)}</span>
                  <a
                    href={`https://explorer.solana.com/address/${p.address}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--solana-purple)', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none', fontWeight: 600 }}
                  >
                    <span>Inspect Account</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
