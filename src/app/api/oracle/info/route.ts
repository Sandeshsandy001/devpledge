import { NextResponse } from 'next/server';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getOracleKeypair } from '@/lib/solana/oracleKeypair';
import { PROGRAM_ID, DEVNET_RPC_URL, DEFAULT_TREASURY_PUBKEY } from '@/lib/solana/constants';

export async function GET() {
  try {
    const oracleKeypair = getOracleKeypair();
    const connection = new Connection(DEVNET_RPC_URL, 'confirmed');

    let balanceLamports = 0;
    try {
      balanceLamports = await connection.getBalance(oracleKeypair.publicKey);
    } catch {
      // ignore rpc timeout
    }

    return NextResponse.json({
      success: true,
      oraclePublicKey: oracleKeypair.publicKey.toBase58(),
      oracleBalanceSol: balanceLamports / LAMPORTS_PER_SOL,
      programId: PROGRAM_ID.toBase58(),
      network: 'devnet',
      rpcUrl: DEVNET_RPC_URL,
      treasuryPublicKey: DEFAULT_TREASURY_PUBKEY.toBase58(),
      status: 'online',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
