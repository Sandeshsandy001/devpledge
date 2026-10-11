'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Terminal, Shield, Droplets, Info, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { PROGRAM_ID } from '@/lib/solana/constants';

// Dynamically import WalletMultiButton to prevent hydration errors
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  {
    ssr: false,
    loading: () => <button className="wallet-adapter-button">Connecting...</button>,
  }
);

interface NavbarProps {
  onOpenInfo: () => void;
  onOpenFaucet: () => void;
}

export function Navbar({ onOpenInfo, onOpenFaucet }: NavbarProps) {
  const [oracleStatus, setOracleStatus] = useState<{
    online: boolean;
    oraclePublicKey?: string;
    balance?: number;
  }>({ online: false });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOracleStatus = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/oracle/info');
      const data = await res.json();
      if (data.success) {
        setOracleStatus({
          online: true,
          oraclePublicKey: data.oraclePublicKey,
          balance: data.oracleBalanceSol,
        });
      }
    } catch {
      setOracleStatus({ online: false });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOracleStatus();
    const interval = setInterval(fetchOracleStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(7, 8, 13, 0.85)',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0.85rem 0'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        
        {/* Logo and Hackathon Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'var(--solana-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-neon)'
            }}>
              <Terminal size={22} color="#000" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>Dev<span className="gradient-text">Pledge</span></span>
                <span className="pill pill-purple" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>v0.1</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>Superteam Nepal</span>
                <span>•</span>
                <span>Colosseum</span>
              </div>
            </div>
          </a>

          {/* Devnet Network Pill */}
          <div className="pill pill-green" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="pulse-dot pulse-dot-green" />
            <span style={{ fontWeight: 600 }}>Solana Devnet</span>
          </div>
        </div>

        {/* Right side controls & wallet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          {/* Oracle Status Pill */}
          <div 
            onClick={onOpenInfo}
            title={oracleStatus.online ? `Oracle Authority: ${oracleStatus.oraclePublicKey}` : 'Oracle offline'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              background: oracleStatus.online ? 'rgba(20, 241, 149, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${oracleStatus.online ? 'rgba(20, 241, 149, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
              fontSize: '0.78rem',
              cursor: 'pointer',
              color: oracleStatus.online ? '#4ade80' : '#f87171'
            }}
          >
            {oracleStatus.online ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            <span style={{ fontWeight: 600 }}>Relayer Oracle: {oracleStatus.online ? 'Active' : 'Offline'}</span>
          </div>

          {/* Faucet guide button */}
          <button
            id="faucet-modal-btn"
            onClick={onOpenFaucet}
            className="btn-secondary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
            title="Get Devnet SOL"
          >
            <Droplets size={14} color="#14f195" />
            <span>Devnet Faucet</span>
          </button>

          {/* IDL & Docs button */}
          <button
            id="docs-modal-btn"
            onClick={onOpenInfo}
            className="btn-secondary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
            title="Smart Contract & IDL Diagnostics"
          >
            <Shield size={14} color="#9945ff" />
            <span>Contract Spec</span>
          </button>

          {/* Solana Wallet Adapter Button */}
          <div id="wallet-connect-wrapper">
            <WalletMultiButton />
          </div>

        </div>

      </div>
    </header>
  );
}
