'use client';

import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Search, 
  ExternalLink, 
  Clock, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { PledgeAccountData } from '@/lib/solana/account';

export function GlobalPledgesExplorer() {
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
    <div className="clean-card" style={{ padding: '1.75rem' }}>
      
      {/* Header & Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Globe size={16} />
            <span>Community Escrow Explorer</span>
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Live commitment accounts deployed on Solana Devnet.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search user or GitHub..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.1rem', paddingRight: '0.75rem', fontSize: '0.8rem', height: '34px' }}
            />
          </div>

          <button
            onClick={loadPledges}
            disabled={isLoading}
            className="btn-secondary"
            style={{ padding: '0.4rem 0.75rem', height: '34px', fontSize: '0.8rem' }}
            title="Refresh Devnet pledges"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

      </div>

      {/* Pledges Grid */}
      {isLoading && pledges.length === 0 ? (
        <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
          <span>Scanning Devnet program accounts...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          border: '1px dashed var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-muted)',
          fontSize: '0.85rem'
        }}>
          {searchQuery ? 'No commitments match your search.' : 'No active commitments found on Devnet.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
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
                  background: '#18181b',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                
                {/* User & Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <img
                      src={`https://github.com/${p.githubUsername}.png`}
                      alt={p.githubUsername}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--border-subtle)' }}
                    />
                    <div>
                      <a
                        href={`https://github.com/${p.githubUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fafafa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <span>@{p.githubUsername}</span>
                        <ExternalLink size={10} color="var(--text-muted)" />
                      </a>
                      <div className="mono-text" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {p.user.slice(0, 4)}...{p.user.slice(-4)}
                      </div>
                    </div>
                  </div>

                  {isExpired ? (
                    <span className="status-pill" style={{ color: '#f87171', fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                      <AlertTriangle size={10} />
                      <span>Expired</span>
                    </span>
                  ) : (
                    <span className="status-pill" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                      <Clock size={10} />
                      <span>{hoursLeft}h {minsLeft}m</span>
                    </span>
                  )}
                </div>

                {/* Amount & Target */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#121215',
                  borderRadius: '4px',
                  padding: '0.5rem 0.65rem',
                  fontSize: '0.78rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block' }}>LOCKED</span>
                    <span className="mono-text" style={{ fontWeight: 600, color: '#fafafa' }}>
                      {p.amountSol} SOL
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block' }}>TARGET</span>
                    <span style={{ fontWeight: 500, color: '#fafafa' }}>
                      {p.targetCommits} Commits
                    </span>
                  </div>
                </div>

                {/* Footer link to Solana Explorer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>PDA: {p.address.slice(0, 6)}...{p.address.slice(-4)}</span>
                  <a
                    href={`https://explorer.solana.com/address/${p.address}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}
                  >
                    <span>Explorer</span>
                    <ExternalLink size={11} />
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
