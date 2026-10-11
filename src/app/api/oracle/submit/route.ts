import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { DEVNET_RPC_URL } from '@/lib/solana/constants';

const DEVNET_ENDPOINTS = [
  'https://api.devnet.solana.com',
  'https://rpc.ankr.com/solana_devnet',
  DEVNET_RPC_URL,
];

export async function POST(req: NextRequest) {
  try {
    const { transactionBase64 } = await req.json();
    if (!transactionBase64) {
      return NextResponse.json({ success: false, error: 'Missing transaction data' }, { status: 400 });
    }

    const rawTx = Buffer.from(transactionBase64, 'base64');

    let lastError: unknown = null;
    for (const endpoint of DEVNET_ENDPOINTS) {
      try {
        const connection = new Connection(endpoint, 'confirmed');
        const signature = await connection.sendRawTransaction(rawTx, {
          skipPreflight: false,
          maxRetries: 3,
        });

        // Safe background confirmation polling
        try {
          await connection.confirmTransaction(signature, 'confirmed');
        } catch (confirmErr) {
          console.warn(`Transaction confirm polling on ${endpoint} warned:`, confirmErr);
        }

        return NextResponse.json({
          success: true,
          signature,
          explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
        });
      } catch (err) {
        lastError = err;
        console.warn(`Failed to broadcast via ${endpoint}:`, err);
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError);
    return NextResponse.json({ success: false, error: `Failed to broadcast transaction: ${message}` }, { status: 500 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
