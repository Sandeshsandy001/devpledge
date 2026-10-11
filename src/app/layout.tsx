import type { Metadata } from 'next';
import './globals.css';
import { SolanaWalletProvider } from '@/components/SolanaWalletProvider';

export const metadata: Metadata = {
  title: 'DevPledge | Web3 Commitment Escrow on Solana Devnet',
  description:
    'A trustless accountability dApp for developers. Lock SOL in escrow to force yourself to ship code on GitHub. Verified by automated GitHub Oracle relayer.',
  keywords: [
    'Solana',
    'DevPledge',
    'Escrow',
    'Colosseum',
    'Superteam Nepal',
    'GitHub',
    'Smart Contract',
    'Anchor',
    'Devnet',
  ],
  authors: [{ name: 'DevPledge Core Team' }],
  openGraph: {
    title: 'DevPledge | Web3 Commitment Escrow',
    description: 'Lock SOL. Ship Code. Or Get Slashed.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <div className="ambient-bg" aria-hidden="true">
          <div className="ambient-blob-1" />
          <div className="ambient-blob-2" />
          <div className="ambient-grid" />
        </div>
        <SolanaWalletProvider>
          {children}
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
