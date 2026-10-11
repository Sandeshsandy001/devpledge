'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { CreatePledgeCard } from '@/components/CreatePledgeCard';
import { ActivePledgeCard } from '@/components/ActivePledgeCard';
import { HowItWorksCard } from '@/components/HowItWorksCard';
import { GlobalPledgesExplorer } from '@/components/GlobalPledgesExplorer';
import { PledgeAccountData, fetchPledgeAccount } from '@/lib/solana/account';
import { PROGRAM_ID } from '@/lib/solana/constants';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [activePledge, setActivePledge] = useState<PledgeAccountData | null>(null);
  const [loadingPledge, setLoadingPledge] = useState(false);

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
      
      {/* Minimal Top Navigation */}
      <Navbar />

      <main style={{ flex: 1, paddingBottom: '5rem' }}>
        
        {/* Minimal Hero Section */}
        <HeroSection />

        <div className="container" style={{ marginTop: '1rem' }}>
          
          {/* Main 2-Column Dashboard View */}
          <div className="dashboard-grid">
            
            {/* Left Column: Active Escrow (if existing) or Create Escrow Form */}
            <div>
              {loadingPledge ? (
                <div className="clean-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem', display: 'block', color: 'var(--text-primary)' }} />
                  <span style={{ fontSize: '0.85rem' }}>Checking on-chain escrow state...</span>
                </div>
              ) : activePledge ? (
                <ActivePledgeCard pledge={activePledge} onRefresh={fetchUserPledge} />
              ) : (
                <CreatePledgeCard onPledgeCreated={fetchUserPledge} />
              )}
            </div>

            {/* Right Column: How It Works & Program ID Verification */}
            <div>
              <HowItWorksCard />
            </div>

          </div>

          {/* Bottom: Community Escrow Explorer */}
          <div>
            <GlobalPledgesExplorer />
          </div>

        </div>

      </main>

      {/* Production-grade Minimal Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        padding: '2rem 0',
        marginTop: 'auto',
        transition: 'background-color 0.2s ease, border-color 0.2s ease'
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.82rem',
          color: 'var(--text-muted)'
        }}>
          <div>
            DevPledge © 2026. Non-custodial commitment escrow on Solana.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <a
              href={`https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
            >
              Program on Solana Explorer
            </a>
            <a
              href="https://github.com/Sandeshsandy001/devpledge"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
            >
              GitHub Source
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
