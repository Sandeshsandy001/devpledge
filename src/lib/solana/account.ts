import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, PLEDGE_ACCOUNT_DISCRIMINATOR, PLEDGE_SEED } from './constants';

export interface PledgeAccountData {
  address: string;
  user: string;
  authority: string;
  treasury: string;
  amountLamports: string;
  amountSol: number;
  githubUsername: string;
  startTime: number; // Unix timestamp seconds
  deadline: number; // Unix timestamp seconds
  targetCommits: number;
  bump: number;
  isActive: boolean;
  isExpired: boolean;
}

export function derivePledgePda(userPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PLEDGE_SEED), userPubkey.toBuffer()],
    PROGRAM_ID
  );
}

export function decodePledgeAccount(data: Buffer, address: PublicKey): PledgeAccountData | null {
  if (data.length < 125) return null;

  // Check discriminator
  const disc = data.subarray(0, 8);
  if (!disc.equals(PLEDGE_ACCOUNT_DISCRIMINATOR)) {
    return null;
  }

  let offset = 8;
  const user = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const authority = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const treasury = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const amountLamports = view.getBigUint64(offset, true);
  offset += 8;

  const strLen = view.getUint32(offset, true);
  offset += 4;

  const githubUsername = data.subarray(offset, offset + strLen).toString('utf8');
  offset += strLen;

  const startTime = Number(view.getBigInt64(offset, true));
  offset += 8;

  const deadline = Number(view.getBigInt64(offset, true));
  offset += 8;

  const targetCommits = view.getUint8(offset);
  offset += 1;

  const bump = view.getUint8(offset);
  offset += 1;

  const nowSec = Math.floor(Date.now() / 1000);
  const isExpired = nowSec >= deadline;

  return {
    address: address.toBase58(),
    user,
    authority,
    treasury,
    amountLamports: amountLamports.toString(),
    amountSol: Number(amountLamports) / 1_000_000_000,
    githubUsername,
    startTime,
    deadline,
    targetCommits,
    bump,
    isActive: true,
    isExpired,
  };
}

export async function fetchPledgeAccount(
  connection: Connection,
  userPubkey: PublicKey
): Promise<PledgeAccountData | null> {
  const [pda] = derivePledgePda(userPubkey);
  const accountInfo = await connection.getAccountInfo(pda, 'confirmed');

  if (!accountInfo || !accountInfo.data) {
    return null;
  }

  return decodePledgeAccount(accountInfo.data, pda);
}

export async function fetchAllActivePledges(connection: Connection): Promise<PledgeAccountData[]> {
  try {
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: PLEDGE_ACCOUNT_DISCRIMINATOR.toString('base64'),
            encoding: 'base64',
          },
        },
      ],
    });

    const results: PledgeAccountData[] = [];
    for (const acc of accounts) {
      const decoded = decodePledgeAccount(acc.account.data, acc.pubkey);
      if (decoded) {
        results.push(decoded);
      }
    }

    // Sort by newest first
    return results.sort((a, b) => b.startTime - a.startTime);
  } catch (err) {
    console.error('Failed to fetch program accounts:', err);
    return [];
  }
}
