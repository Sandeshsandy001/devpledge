'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { CreatePledgeCard } from '@/components/CreatePledgeCard';
import { ActivePledgeCard } from '@/components/ActivePledgeCard';
import { GlobalPledgesExplorer } from '@/components/GlobalPledgesExplorer';
import { OracleDiagnosticsModal } from '@/components/OracleDiagnosticsModal';
import { FaucetModal } from '@/components/FaucetModal';
import { PledgeAccountData, fetchPledgeAccount } from '@/lib/solana/account';
import { PROGRAM_ID } from '@/lib/solana/constants';
import { Loader2, Plus, ShieldCheck, Terminal, Heart } from 'lucide-react';

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();

  const [activePledge, setActivePledge] = useState<PledgeAccountData | null>(null);
  const [loadingPledge, setLoadingPledge] = useState(false);
  const [activeTab, setActiveTab] = useState<'mission-control' | 'create' | 'explorer'>('create');

  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isFaucetOpen, setIsFaucetOpen] = useState(false);

  // Fetch active pledge for connected wallet
  const fetchUserPledge = useCallback(async () => {
    if (!publicKey) {
      setActivePledge(null);
      return;
    }

    try {
      setLoadingPledge(true);
      const pledge = await fetchPledgeAccount(connection, publicKey);
      setActivePledge(pledge);
      if (pledge) {
        setActiveTab('mission-control');
      }
    } catch (err) {
      console.error('Error fetching user pledge:', err);
    } finally {
      setLoadingPledge(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    fetchUserPledge();
  }, [fetchUserPledge]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* Top Navigation */}
      <Navbar
        onOpenInfo={() => setIsDiagnosticsOpen(true)}
        onOpenFaucet={() => setIsFaucetOpen(true)}
      />

      <main style={{ flex: 1, paddingBottom: '4rem' }}>
        
        {/* Hero Section */}
        <HeroSection />

        <div className="container" style={{ marginTop: '2rem' }}>
          
          {/* Navigation Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            marginBottom: '2rem',
            flexWrap: 'wrap'
          }}>
            
            {activePledge && (
              <button
                id="tab-mission-control"
                onClick={() => setActiveTab('mission-control')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.75rem 1.4rem',
                  borderRadius: 'var(--radius-md)',
                  background: activeTab === 'mission-control' ? 'var(--solana-gradient)' : 'rgba(255, 255, 255, 0.05)',
                  color: activeTab === 'mission-control' ? '#000' : 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: activeTab === 'mission-control' ? 'var(--shadow-neon)' : 'none'
                }}
              >
                <ShieldCheck size={16} />
                <span>My Active Escrow ({activePledge.amountSol} SOL)</span>
              </button>
            )}

            <button
              id="tab-create-pledge"
              onClick={() => setActiveTab('create')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.75rem 1.4rem',
                borderRadius: 'var(--radius-md)',
                background: activeTab === 'create' ? 'var(--solana-gradient)' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === 'create' ? '#000' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'create' ? 'var(--shadow-neon)' : 'none'
              }}
            >
              <Plus size={16} />
              <span>Create Commitment Escrow</span>
            </button>

            <button
              id="tab-explorer"
              onClick={() => setActiveTab('explorer')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.75rem 1.4rem',
                borderRadius: 'var(--radius-md)',
                background: activeTab === 'explorer' ? 'var(--solana-gradient)' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === 'explorer' ? '#000' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'explorer' ? 'var(--shadow-neon)' : 'none'
              }}
            >
              <Terminal size={16} />
              <span>Devnet Escrow Explorer</span>
            </button>

          </div>

          {/* Active Tab View */}
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            {loadingPledge ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem', display: 'block', color: 'var(--solana-green)' }} />
                <span>Checking on-chain escrow state for your wallet...</span>
              </div>
            ) : activeTab === 'mission-control' && activePledge ? (
              <ActivePledgeCard pledge={activePledge} onRefresh={fetchUserPledge} />
            ) : activeTab === 'create' ? (
              <CreatePledgeCard onPledgeCreated={fetchUserPledge} />
            ) : (
              <GlobalPledgesExplorer />
            )}
          </div>

          {/* Community Feed underneath Create view */}
          {activeTab === 'create' && (
            <div style={{ maxWidth: '960px', margin: '3rem auto 0' }}>
              <GlobalPledgesExplorer />
            </div>
          )}

        </div>

      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(7, 8, 13, 0.95)',
        padding: '2.5rem 0',
        marginTop: 'auto'
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          fontSize: '0.85rem',
          color: 'var(--text-muted)'
        }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
              <span>DevPledge Escrow</span>
              <span className="pill pill-purple" style={{ fontSize: '0.65rem' }}>Solana Devnet</span>
            </div>
            <div>Built for the Colosseum & Superteam Nepal Hackathons.</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsDiagnosticsOpen(true)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Anchor IDL
            </button>
            <a
              href={`https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              Contract Explorer
            </a>
            <a
              href="https://github.com/Sandeshsandy001"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              GitHub Org
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <OracleDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />

      <FaucetModal
        isOpen={isFaucetOpen}
        onClose={() => setIsFaucetOpen(false)}
      />

    </div>
  );
}
