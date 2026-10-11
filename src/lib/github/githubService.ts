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
  rateLimited?: boolean;
}

// Memory store for simulated commits during testing / demoing
const simulatedCommitsStore = new Map<string, CommitItem[]>();

export function addSimulatedCommit(username: string, repo: string, message: string): CommitItem {
  const normUser = username.toLowerCase();
  const commit: CommitItem = {
    id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sha: Math.random().toString(16).slice(2, 9),
    message: message || 'feat: ship milestone update #solana',
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
      // If 403 rate-limited or any other error, provide fallback public profile
      return {
        username,
        name: username,
        avatarUrl: `https://github.com/${username}.png`,
        bio: null,
        publicRepos: 1,
        followers: 0,
        profileUrl: `https://github.com/${username}`,
      };
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
    console.warn('Error fetching GitHub profile, using fallback:', err);
    return {
      username,
      name: username,
      avatarUrl: `https://github.com/${username}.png`,
      bio: null,
      publicRepos: 1,
      followers: 0,
      profileUrl: `https://github.com/${username}`,
    };
  }
}

function decodeHtml(html: string): string {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Fallback Atom feed parser: parses public GitHub Atom push feed without API rate limits.
 */
async function fetchAtomCommits(username: string, startMs: number): Promise<CommitItem[]> {
  try {
    const res = await fetch(`https://github.com/${encodeURIComponent(username)}.atom`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DevPledge/1.0)',
      },
      cache: 'no-store',
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const entries = xml.split('<entry>');
    const commits: CommitItem[] = [];

    for (let i = 1; i < entries.length; i++) {
      const rawEntry = entries[i];
      const pubMatch = rawEntry.match(/<(?:published|updated)>(.*?)<\/(?:published|updated)>/);
      const pubStr = pubMatch ? pubMatch[1].replace(' UTC', 'Z') : '';
      const pubTime = new Date(pubStr).getTime();
      if (pubTime < startMs) continue;

      const e = decodeHtml(rawEntry);

      // Extract repo name
      const repoMatch =
        e.match(/href="\/([^\/"]+\/[^\/"]+)"[^>]*rel="noreferrer"[^>]*>[^<]+<\/[aA]>\s*<span>/i) ||
        e.match(/pushed to[\s\S]*?in\s*<a[^>]*href="\/([^"]+)"/i) ||
        e.match(/<title[^>]*>.*?pushed\s+([^\s<]+)/i);

      let repoName = repoMatch ? repoMatch[1] : '';
      if (!repoName.includes('/')) {
        repoName = `${username}/${repoName || 'repo'}`;
      }

      // Extract individual commits inside this push event
      const commitRegex =
        /href="\/([^\/"]+\/[^\/"]+)\/commit\/([a-f0-9]+)"[^>]*>([a-f0-9]+)<\/a><\/code>[\s\S]*?<blockquote>\s*([\s\S]*?)\s*<\/blockquote>/gi;
      let m;
      let found = false;
      while ((m = commitRegex.exec(e)) !== null) {
        found = true;
        commits.push({
          id: `${m[2]}`,
          sha: m[3].trim(),
          message: m[4].replace(/<[^>]+>/g, '').trim(),
          repo: m[1] || repoName,
          timestamp: pubStr,
          url: `https://github.com/${m[1] || repoName}/commit/${m[2]}`,
        });
      }

      if (!found) {
        const titleMatch = rawEntry.match(/<title[^>]*>(.*?)<\/title>/);
        commits.push({
          id: `push-${pubTime}`,
          sha: 'push',
          message: titleMatch
            ? decodeHtml(titleMatch[1])
            : `Pushed code to ${repoName}`,
          repo: repoName,
          timestamp: pubStr,
          url: `https://github.com/${repoName}`,
        });
      }
    }

    return commits;
  } catch (err) {
    console.warn('Error fetching GitHub Atom feed:', err);
    return [];
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
  let rateLimited = false;

  // 1. Try REST API
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'DevPledge-Oracle/1.0',
      Accept: 'application/vnd.github.v3+json',
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

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
      if (res.status === 403) {
        rateLimited = true;
      }
      console.warn(`GitHub REST events returned ${res.status}. Falling back to public Atom feed.`);
    }
  } catch (err) {
    console.error('Error fetching GitHub REST events:', err);
  }

  // 2. If REST was rate-limited or didn't find commits, query unthrottled public Atom feed
  if (collectedCommits.length === 0 || rateLimited) {
    const atomCommits = await fetchAtomCommits(username, startMs);
    for (const ac of atomCommits) {
      if (!collectedCommits.some((c) => c.sha === ac.sha || c.id === ac.id)) {
        collectedCommits.push(ac);
      }
    }
  }

  // 3. Include any simulated test commits
  const sim = simulatedCommitsStore.get(username.toLowerCase()) || [];
  for (const c of sim) {
    const cMs = new Date(c.timestamp).getTime();
    if (cMs >= startMs) {
      if (!collectedCommits.some((exist) => exist.sha === c.sha || exist.id === c.id)) {
        collectedCommits.unshift(c);
      }
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
    rateLimited,
  };
}
