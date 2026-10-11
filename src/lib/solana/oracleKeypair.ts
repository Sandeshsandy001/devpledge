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

  // 3. Generate a persistent keypair for this environment and save it
  const newKeypair = Keypair.generate();
  try {
    fs.writeFileSync(KEYPAIR_FILE, JSON.stringify(Array.from(newKeypair.secretKey)), 'utf8');
  } catch (err) {
    console.warn('Could not persist new oracle keypair to disk:', err);
  }

  cachedKeypair = newKeypair;
  return cachedKeypair;
}

export function getOraclePublicKey(): string {
  return getOracleKeypair().publicKey.toBase58();
}
