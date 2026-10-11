import { NextRequest, NextResponse } from 'next/server';

const DEVNET_ENDPOINTS = [
  'https://api.devnet.solana.com',
  'https://rpc.ankr.com/solana_devnet',
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let lastError: unknown = null;
    for (const endpoint of DEVNET_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }
      } catch (err) {
        lastError = err;
      }
    }

    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32603, message: 'All Devnet RPC endpoints failed' }, id: body.id ?? null },
      { status: 502 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32603, message }, id: null },
      { status: 500 }
    );
  }
}
