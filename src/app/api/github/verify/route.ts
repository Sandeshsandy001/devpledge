import { NextRequest, NextResponse } from 'next/server';
import { verifyUserCommits, fetchGitHubProfile } from '@/lib/github/githubService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, startTime, targetCommits } = body;

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ success: false, error: 'GitHub username is required' }, { status: 400 });
    }

    const startSec = typeof startTime === 'number' ? startTime : 0;
    const target = typeof targetCommits === 'number' ? targetCommits : 5;

    const result = await verifyUserCommits(username.trim(), startSec, target);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ success: false, error: 'Username is required' }, { status: 400 });
  }

  const profile = await fetchGitHubProfile(username.trim());
  if (!profile) {
    return NextResponse.json({ success: false, error: 'GitHub user not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, profile });
}
