import type { Metadata } from 'next';
import './globals.css';
import { SolanaWalletProvider } from '@/components/SolanaWalletProvider';

export const metadata: Metadata = {
  title: 'DevPledge | Non-custodial Commitment Escrow on Solana',
  description:
    'A developer accountability tool. Commit funds into trustless escrow to force yourself to ship code on GitHub. Verified on-chain via GitHub commit oracle.',
  keywords: [
    'Solana',
    'DevPledge',
    'Escrow',
    'GitHub',
    'Smart Contract',
    'Anchor',
    'Devnet',
  ],
  authors: [{ name: 'DevPledge' }],
  openGraph: {
    title: 'DevPledge | Non-custodial Commitment Escrow',
    description: 'Commit funds. Ship code. Get refunded.',
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
        <div className="subtle-grid" aria-hidden="true" />
        <SolanaWalletProvider>
          {children}
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
