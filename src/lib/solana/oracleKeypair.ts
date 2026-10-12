import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';

let cachedKeypair: Keypair | null = null;

const KEYPAIR_FILE = path.join(process.cwd(), '.oracle-keypair.json');

export function getOracleKeypair(): Keypair {
  if (cachedKeypair) {
    return cachedKeypair;
  }

  // 1. Check process.env.ORACLE_PRIVATE_KEY
  const envKey = process.env.ORACLE_PRIVATE_KEY;
  if (envKey) {
    try {
      if (envKey.startsWith('[') && envKey.endsWith(']')) {
        const arr = JSON.parse(envKey);
        cachedKeypair = Keypair.fromSecretKey(Uint8Array.from(arr));
        return cachedKeypair;
      }
      const decoded = bs58.decode(envKey);
      cachedKeypair = Keypair.fromSecretKey(decoded);
      return cachedKeypair;
    } catch (err) {
      console.warn('Failed to parse ORACLE_PRIVATE_KEY from env, checking file:', err);
    }
  }

  // 2. Check local file .oracle-keypair.json
  try {
    if (fs.existsSync(KEYPAIR_FILE)) {
      const raw = fs.readFileSync(KEYPAIR_FILE, 'utf8');
      const arr = JSON.parse(raw);
      cachedKeypair = Keypair.fromSecretKey(Uint8Array.from(arr));
      return cachedKeypair;
    }
  } catch (err) {
    console.warn('Failed reading .oracle-keypair.json:', err);
  }

  // 3. Fallback to deterministic keypair ensuring consistent identity across serverless / lambda invocations
  const FALLBACK_SECRET_KEY = [
    137, 78, 121, 242, 4, 179, 140, 254, 160, 100, 224, 117, 150, 20, 119, 129,
    169, 78, 20, 27, 245, 64, 84, 143, 25, 85, 50, 68, 220, 13, 43, 252,
    43, 229, 139, 201, 39, 175, 223, 176, 35, 138, 79, 217, 132, 123, 126, 16,
    83, 132, 77, 122, 111, 118, 207, 41, 102, 26, 135, 16, 191, 181, 224, 178
  ];

  cachedKeypair = Keypair.fromSecretKey(Uint8Array.from(FALLBACK_SECRET_KEY));
  return cachedKeypair;
}

export function getOraclePublicKey(): string {
  return getOracleKeypair().publicKey.toBase58();
}
