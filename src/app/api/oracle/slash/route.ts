import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getOracleKeypair } from '@/lib/solana/oracleKeypair';
import { DEVNET_RPC_URL } from '@/lib/solana/constants';
import { derivePledgePda, fetchPledgeAccount } from '@/lib/solana/account';
import { slashPledgeInstruction } from '@/lib/solana/instructions';

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

    const pledge = await fetchPledgeAccount(connection, userPubkey);
    if (!pledge) {
      return NextResponse.json({
        success: false,
        error: 'Active pledge account not found on Devnet. It may have already been settled or slashed.',
      }, { status: 404 });
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec < pledge.deadline) {
      const remainingSec = pledge.deadline - nowSec;
      return NextResponse.json({
        success: false,
        error: `Cannot slash pledge before deadline! ${Math.ceil(remainingSec / 60)} minutes remaining.`,
        remainingSeconds: remainingSec,
      }, { status: 400 });
    }

    const oracleKeypair = getOracleKeypair();
    const treasuryPubkey = new PublicKey(pledge.treasury);

    // Ensure Oracle has fee lamports
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

    const ix = slashPledgeInstruction({
      pledgePda,
      treasury: treasuryPubkey,
    });

    const { blockhash } = await connection.getLatestBlockhash();

    // If Oracle has gas, it submits directly
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
        slashedSol: pledge.amountSol,
        treasury: pledge.treasury,
        message: `Pledge deadline expired without reaching targets. ${pledge.amountSol} SOL slashed and sent to community treasury.`,
      });
    }

    // If Oracle is out of gas, return the transaction for the caller wallet to submit as fee payer
    const tx = new Transaction().add(ix);
    tx.feePayer = userPubkey;
    tx.recentBlockhash = blockhash;

    const serialized = tx.serialize({ requireAllSignatures: false }).toString('base64');

    return NextResponse.json({
      success: true,
      requiresUserSignature: true,
      transactionBase64: serialized,
      slashedSol: pledge.amountSol,
      treasury: pledge.treasury,
      message: `Pledge deadline expired. Please approve the slash transaction in your wallet.`,
    });
  } catch (err: unknown) {
    console.error('Error slashing pledge:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
