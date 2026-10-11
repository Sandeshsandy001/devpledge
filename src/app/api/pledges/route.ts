import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { DEVNET_RPC_URL } from '@/lib/solana/constants';
import { fetchPledgeAccount, fetchAllActivePledges } from '@/lib/solana/account';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user = searchParams.get('user');

    const connection = new Connection(DEVNET_RPC_URL, 'confirmed');

    if (user) {
      let userPubkey: PublicKey;
      try {
        userPubkey = new PublicKey(user);
      } catch {
        return NextResponse.json({ success: false, error: 'Invalid user address' }, { status: 400 });
      }

      const pledge = await fetchPledgeAccount(connection, userPubkey);
      return NextResponse.json({
        success: true,
        pledge,
      });
    }

    // Fetch all active pledges
    const pledges = await fetchAllActivePledges(connection);
    return NextResponse.json({
      success: true,
      pledges,
      totalCount: pledges.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
