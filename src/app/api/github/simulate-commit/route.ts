import { NextRequest, NextResponse } from 'next/server';
import { addSimulatedCommit, clearSimulatedCommits } from '@/lib/github/githubService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, repo, message, action } = body;

    if (!username) {
      return NextResponse.json({ success: false, error: 'Username is required' }, { status: 400 });
    }

    if (action === 'clear') {
      clearSimulatedCommits(username);
      return NextResponse.json({ success: true, message: 'Simulated commits cleared' });
    }

    const commit = addSimulatedCommit(username, repo, message);
    return NextResponse.json({ success: true, commit });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
