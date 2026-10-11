'use client';

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { DEVNET_RPC_URL } from '@/lib/solana/constants';

// Default styles that can be overridden by our application theme
import '@solana/wallet-adapter-react-ui/styles.css';

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const [endpoint, setEndpoint] = React.useState<string>(DEVNET_RPC_URL);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setEndpoint(`${window.location.origin}/api/rpc`);
    }
  }, []);

  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider
      endpoint={endpoint}
      config={{
        commitment: 'confirmed',
        wsEndpoint: 'wss://api.devnet.solana.com',
      }}
    >
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
