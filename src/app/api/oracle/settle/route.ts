import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getOracleKeypair } from '@/lib/solana/oracleKeypair';
import { DEVNET_RPC_URL } from '@/lib/solana/constants';
import { derivePledgePda, fetchPledgeAccount } from '@/lib/solana/account';
import { settlePledgeInstruction } from '@/lib/solana/instructions';
import { verifyUserCommits } from '@/lib/github/githubService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userAddress } = body;

    if (!userAddress) {
      return NextResponse.json({ success: false, error: 'User address is required' }, { status: 400 });
    }

    let userPubkey: PublicKey;
    try {
      userPubkey = new PublicKey(userAddress);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid user Solana public key' }, { status: 400 });
    }

    const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
    const [pledgePda] = derivePledgePda(userPubkey);

    // 1. Fetch Pledge from chain
    const pledge = await fetchPledgeAccount(connection, userPubkey);
    if (!pledge) {
      return NextResponse.json({
        success: false,
        error: 'Active pledge account not found on Devnet. It may have already been settled or slashed.',
      }, { status: 404 });
    }

    const oracleKeypair = getOracleKeypair();

    // 2. Verify Oracle Authority
    if (pledge.authority !== oracleKeypair.publicKey.toBase58()) {
      return NextResponse.json({
        success: false,
        error: `Authority mismatch. Contract requires authority: ${pledge.authority}, but relayer is: ${oracleKeypair.publicKey.toBase58()}`,
      }, { status: 400 });
    }

    // 3. Verify GitHub Commits
    const verification = await verifyUserCommits(
      pledge.githubUsername,
      pledge.startTime,
      pledge.targetCommits
    );

    if (!verification.targetMet) {
      return NextResponse.json({
        success: false,
        error: `Target not achieved yet: ${verification.totalCommitsSinceStart}/${pledge.targetCommits} commits completed.`,
        progress: {
          current: verification.totalCommitsSinceStart,
          target: pledge.targetCommits,
          commits: verification.commits,
        },
      }, { status: 400 });
    }

    // 4. Ensure Oracle has fee lamports
    let oracleBalance = await connection.getBalance(oracleKeypair.publicKey);
    if (oracleBalance < 10_000) {
      try {
        const airdropSig = await connection.requestAirdrop(oracleKeypair.publicKey, 0.5 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(airdropSig);
        oracleBalance = await connection.getBalance(oracleKeypair.publicKey);
      } catch (e) {
        console.warn('Oracle airdrop attempt failed:', e);
      }
    }

    if (oracleBalance < 5_000) {
      return NextResponse.json({
        success: false,
        error: `Oracle relayer needs Devnet gas. Please airdrop Devnet SOL to Oracle: ${oracleKeypair.publicKey.toBase58()}`,
        oraclePublicKey: oracleKeypair.publicKey.toBase58(),
      }, { status: 503 });
    }

    // 5. Construct settle_pledge instruction and execute
    const ix = settlePledgeInstruction({
      pledgePda,
      user: userPubkey,
      authority: oracleKeypair.publicKey,
    });

    const tx = new Transaction().add(ix);
    tx.feePayer = oracleKeypair.publicKey;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    const signature = await sendAndConfirmTransaction(connection, tx, [oracleKeypair], {
      commitment: 'confirmed',
    });

    return NextResponse.json({
      success: true,
      signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      refundedSol: pledge.amountSol,
      message: `Escrow successfully settled! 100% of ${pledge.amountSol} SOL refunded to developer.`,
      commits: verification.commits,
    });
  } catch (err: unknown) {
    console.error('Error settling pledge:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
