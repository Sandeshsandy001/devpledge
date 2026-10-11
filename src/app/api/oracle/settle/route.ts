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

    // 4. Check Oracle balance
    let oracleBalance = await connection.getBalance(oracleKeypair.publicKey);
    if (oracleBalance < 10_000) {
      try {
        const airdropSig = await connection.requestAirdrop(oracleKeypair.publicKey, 0.5 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(airdropSig);
        oracleBalance = await connection.getBalance(oracleKeypair.publicKey);
      } catch (e) {
        // faucet may be rate-limited
      }
    }

    // 5. Build settlement instruction
    const ix = settlePledgeInstruction({
      pledgePda,
      user: userPubkey,
      authority: oracleKeypair.publicKey,
    });

    const { blockhash } = await connection.getLatestBlockhash();

    // If Oracle has enough balance, it submits and pays gas directly
    if (oracleBalance >= 5_000) {
      const tx = new Transaction().add(ix);
      tx.feePayer = oracleKeypair.publicKey;
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
    }

    // If Oracle is out of testnet gas, Oracle co-signs and returns transaction
    // for user wallet to finalize and submit (user pays tiny 0.000005 SOL fee)
    const tx = new Transaction().add(ix);
    tx.feePayer = userPubkey;
    tx.recentBlockhash = blockhash;
    tx.partialSign(oracleKeypair);

    const serialized = tx.serialize({ requireAllSignatures: false }).toString('base64');

    return NextResponse.json({
      success: true,
      requiresUserSignature: true,
      transactionBase64: serialized,
      refundedSol: pledge.amountSol,
      message: `Oracle verified commit targets and co-signed settlement! Approve in wallet to receive refund.`,
      commits: verification.commits,
    });
  } catch (err: unknown) {
    console.error('Error settling pledge:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
