// src/app/api/external/github/route.ts
// Fetches GitHub repo metadata (and a README excerpt for RAG) via the public
// REST API — unauthenticated, 60 req/h per IP, which is plenty for saves.
import { NextRequest, NextResponse } from 'next/server';

const FETCH_TIMEOUT_MS = 10_000;
// The README is the RAG content for a repo; embedText caps input at 8k chars
// anyway, so fetching more would be wasted.
const README_MAX_CHARS = 8000;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const match = String(url).match(/github\.com\/([\w.-]+)\/([\w.-]+)/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid GitHub repo URL' }, { status: 400 });
    }
    const [, owner, repoRaw] = match;
    const repo = repoRaw.replace(/\.git$/, '');

    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Memoric/1.0 (personal knowledge base)',
    };

    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!repoRes.ok) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }
    const data = await repoRes.json();

    // README excerpt is the best RAG signal a repo has; optional.
    let readmeExcerpt = '';
    try {
      const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
        headers: { ...headers, Accept: 'application/vnd.github.raw+json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (readmeRes.ok) {
        readmeExcerpt = (await readmeRes.text()).slice(0, README_MAX_CHARS);
      }
    } catch {
      // README is a nice-to-have only.
    }

    return NextResponse.json({
      success: true,
      data: {
        title: data.full_name,
        // `text` becomes the saved item's content — the README is the RAG
        // context for a repo; stats/topics stay in external_data only.
        text: readmeExcerpt || data.description || '',
        description: data.description || '',
        owner: data.owner?.login,
        stars: data.stargazers_count ?? 0,
        forks: data.forks_count ?? 0,
        language: data.language ?? null,
        topics: data.topics ?? [],
        // GitHub's generated social-preview card for the repo.
        thumbnail: `https://opengraph.githubassets.com/1/${owner}/${repo}`,
        homepage: data.homepage || null,
        url: data.html_url,
      },
      metadata: { platform: 'github', type: 'repository', url },
    });
  } catch (error) {
    console.error('GitHub API error:', error);
    return NextResponse.json({ error: 'Failed to fetch GitHub data' }, { status: 500 });
  }
}
