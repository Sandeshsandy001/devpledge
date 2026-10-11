export interface GitHubProfile {
  username: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  publicRepos: number;
  followers: number;
  profileUrl: string;
}

export interface CommitItem {
  id: string;
  sha: string;
  message: string;
  repo: string;
  timestamp: string;
  url: string;
}

export interface GitHubVerificationResult {
  validUser: boolean;
  profile?: GitHubProfile;
  totalCommitsSinceStart: number;
  targetCommits: number;
  targetMet: boolean;
  commits: CommitItem[];
  startTime: number;
  checkedAt: number;
  error?: string;
}

// Memory store for simulated commits during testing / demoing
const simulatedCommitsStore = new Map<string, CommitItem[]>();

export function addSimulatedCommit(username: string, repo: string, message: string): CommitItem {
  const normUser = username.toLowerCase();
  const commit: CommitItem = {
    id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sha: Math.random().toString(16).slice(2, 9),
    message: message || 'feat: ship hackathon MVP update #solana',
    repo: repo || `${username}/devpledge-submission`,
    timestamp: new Date().toISOString(),
    url: `https://github.com/${username}/${repo || 'devpledge-submission'}`,
  };

  const existing = simulatedCommitsStore.get(normUser) || [];
  existing.unshift(commit);
  simulatedCommitsStore.set(normUser, existing);
  return commit;
}

export function clearSimulatedCommits(username: string) {
  simulatedCommitsStore.delete(username.toLowerCase());
}

export async function fetchGitHubProfile(username: string): Promise<GitHubProfile | null> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'DevPledge-Oracle/1.0',
      Accept: 'application/vnd.github.v3+json',
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers,
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      console.warn(`GitHub API profile returned ${res.status} for ${username}`);
      return null;
    }

    const data = await res.json();
    return {
      username: data.login,
      name: data.name || data.login,
      avatarUrl: data.avatar_url,
      bio: data.bio || '',
      publicRepos: data.public_repos || 0,
      followers: data.followers || 0,
      profileUrl: data.html_url,
    };
  } catch (err) {
    console.error('Error fetching GitHub profile:', err);
    return null;
  }
}

export async function verifyUserCommits(
  username: string,
  startTimeSec: number,
  targetCommits: number
): Promise<GitHubVerificationResult> {
  const profile = await fetchGitHubProfile(username);
  if (!profile) {
    return {
      validUser: false,
      totalCommitsSinceStart: 0,
      targetCommits,
      targetMet: false,
      commits: [],
      startTime: startTimeSec,
      checkedAt: Math.floor(Date.now() / 1000),
      error: `GitHub user '${username}' not found`,
    };
  }

  const collectedCommits: CommitItem[] = [];
  const startMs = startTimeSec * 1000;

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'DevPledge-Oracle/1.0',
      Accept: 'application/vnd.github.v3+json',
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    // Fetch user public events
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`,
      {
        headers,
        cache: 'no-store',
      }
    );

    if (res.ok) {
      const events = await res.json();
      if (Array.isArray(events)) {
        for (const evt of events) {
          if (evt.type === 'PushEvent' && evt.created_at) {
            const evtTimeMs = new Date(evt.created_at).getTime();
            if (evtTimeMs >= startMs) {
              const repoName = evt.repo?.name || 'unknown-repo';
              const commitsList = evt.payload?.commits;
              if (Array.isArray(commitsList)) {
                for (const c of commitsList) {
                  collectedCommits.push({
                    id: `${evt.id}-${c.sha || Math.random().toString(36)}`,
                    sha: (c.sha || '').slice(0, 7) || 'HEAD',
                    message: c.message || 'commit',
                    repo: repoName,
                    timestamp: evt.created_at,
                    url: c.url || `https://github.com/${repoName}`,
                  });
                }
              } else {
                // Count push event as at least 1 commit if payload commits not detailed
                collectedCommits.push({
                  id: `${evt.id}`,
                  sha: 'push',
                  message: `Pushed code to ${repoName}`,
                  repo: repoName,
                  timestamp: evt.created_at,
                  url: `https://github.com/${repoName}`,
                });
              }
            }
          }
        }
      }
    } else {
      console.warn(`GitHub events returned status ${res.status}`);
    }
  } catch (err) {
    console.error('Error fetching GitHub events:', err);
  }

  // Include any simulated test commits created for this demo
  const sim = simulatedCommitsStore.get(username.toLowerCase()) || [];
  for (const c of sim) {
    const cMs = new Date(c.timestamp).getTime();
    if (cMs >= startMs) {
      collectedCommits.unshift(c);
    }
  }

  const total = collectedCommits.length;
  const targetMet = total >= targetCommits;

  return {
    validUser: true,
    profile,
    totalCommitsSinceStart: total,
    targetCommits,
    targetMet,
    commits: collectedCommits,
    startTime: startTimeSec,
    checkedAt: Math.floor(Date.now() / 1000),
  };
}
