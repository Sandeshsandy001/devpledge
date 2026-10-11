import { PublicKey } from '@solana/web3.js';

export const PROGRAM_ID = new PublicKey('FD17pHenPk3MXow2BMqWWH6N31UgTRwQJ1c8zimPPM5G');

export const DEVNET_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com';

// Seeds for pledge PDA: ["pledge", user_pubkey]
export const PLEDGE_SEED = 'pledge';

// Instruction discriminators verified against the on-chain deployed program:
// sha256("global:create_pledge")[0..8] = [86, 26, 21, 66, 130, 186, 102, 36]
export const CREATE_PLEDGE_DISCRIMINATOR = Buffer.from([86, 26, 21, 66, 130, 186, 102, 36]);

// sha256("global:settle_pledge")[0..8] = [10, 255, 168, 255, 64, 232, 134, 135]
export const SETTLE_PLEDGE_DISCRIMINATOR = Buffer.from([10, 255, 168, 255, 64, 232, 134, 135]);

// sha256("global:slash_pledge")[0..8] = [115, 17, 113, 41, 119, 112, 230, 114]
export const SLASH_PLEDGE_DISCRIMINATOR = Buffer.from([115, 17, 113, 41, 119, 112, 230, 114]);

// Account discriminator for Pledge:
// sha256("account:Pledge")[0..8] = [161, 197, 121, 46, 99, 75, 169, 131]
export const PLEDGE_ACCOUNT_DISCRIMINATOR = Buffer.from([161, 197, 121, 46, 99, 75, 169, 131]);

// Default Community Treasury for Colosseum & Superteam Nepal hackathons
// Can be overridden via NEXT_PUBLIC_TREASURY_PUBKEY
export const DEFAULT_TREASURY_PUBKEY = new PublicKey(
  process.env.NEXT_PUBLIC_TREASURY_PUBKEY || 'Dp2U1L4ZkHkY87y6w8kX6qF9Kk7Xj4g2r5m9w3L8x1yZ'
);

export const COMMIT_OPTIONS = [3, 5, 10, 25] as const;

export const DURATION_OPTIONS = [
  { label: '10 Mins (Speedrun Demo)', seconds: 600 },
  { label: '1 Hour', seconds: 3600 },
  { label: '24 Hours', seconds: 86400 },
  { label: '3 Days', seconds: 259200 },
  { label: '7 Days (1 Week)', seconds: 604800 },
] as const;
