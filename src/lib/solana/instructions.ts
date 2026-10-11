import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import {
  PROGRAM_ID,
  CREATE_PLEDGE_DISCRIMINATOR,
  SETTLE_PLEDGE_DISCRIMINATOR,
  SLASH_PLEDGE_DISCRIMINATOR,
} from './constants';
import { derivePledgePda } from './account';

export interface CreatePledgeParams {
  user: PublicKey;
  authority: PublicKey;
  treasury: PublicKey;
  amountLamports: bigint | number;
  githubUsername: string;
  durationSeconds: bigint | number;
  targetCommits: number;
}

function writeU64LE(val: bigint | number): Buffer {
  const buf = Buffer.alloc(8);
  const view = new DataView(buf.buffer, buf.byteOffset, 8);
  view.setBigUint64(0, BigInt(val), true);
  return buf;
}

function writeI64LE(val: bigint | number): Buffer {
  const buf = Buffer.alloc(8);
  const view = new DataView(buf.buffer, buf.byteOffset, 8);
  view.setBigInt64(0, BigInt(val), true);
  return buf;
}

function writeU32LE(val: number): Buffer {
  const buf = Buffer.alloc(4);
  const view = new DataView(buf.buffer, buf.byteOffset, 4);
  view.setUint32(0, val, true);
  return buf;
}

export function createPledgeInstruction(params: CreatePledgeParams): TransactionInstruction {
  const { user, authority, treasury, amountLamports, githubUsername, durationSeconds, targetCommits } = params;

  const [pledgePda] = derivePledgePda(user);

  // Validate username length (program requires <= 39 chars)
  if (githubUsername.length > 39) {
    throw new Error('GitHub username must be 39 characters or fewer.');
  }

  const amountBuf = writeU64LE(amountLamports);

  const userBytes = Buffer.from(githubUsername, 'utf8');
  const userLenBuf = writeU32LE(userBytes.length);

  const durationBuf = writeI64LE(durationSeconds);

  const commitsBuf = Buffer.from([Math.min(255, Math.max(1, targetCommits))]);

  const ixData = Buffer.concat([
    CREATE_PLEDGE_DISCRIMINATOR,
    amountBuf,
    userLenBuf,
    userBytes,
    durationBuf,
    commitsBuf,
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: pledgePda, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: treasury, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: ixData,
  });
}

export interface SettlePledgeParams {
  pledgePda: PublicKey;
  user: PublicKey;
  authority: PublicKey;
}

export function settlePledgeInstruction(params: SettlePledgeParams): TransactionInstruction {
  const { pledgePda, user, authority } = params;

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: pledgePda, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: true },
    ],
    data: SETTLE_PLEDGE_DISCRIMINATOR,
  });
}

export interface SlashPledgeParams {
  pledgePda: PublicKey;
  treasury: PublicKey;
}

export function slashPledgeInstruction(params: SlashPledgeParams): TransactionInstruction {
  const { pledgePda, treasury } = params;

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: pledgePda, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
    ],
    data: SLASH_PLEDGE_DISCRIMINATOR,
  });
}
