// src/app/api/external/reddit/route.ts
// Reddit fetcher with two paths:
//   1. Official API with free app-only OAuth (REDDIT_CLIENT_ID +
//      REDDIT_CLIENT_SECRET — register a "script" app at
//      https://www.reddit.com/prefs/apps; the free tier allows 100 req/min).
//      This returns the full post body plus the top comments.
//   2. If no credentials are set (or the API is blocked), an OpenGraph
//      fallback scrapes the post page's meta tags with a crawler UA — Reddit
//      serves those without auth on any network. It captures the post title,
//      thumbnail and a short blurb (not the comment thread), so a save always
//      stores something useful instead of erroring.
// Handles canonical post URLs, redd.it short links and /s/ share links.
import { NextRequest, NextResponse } from 'next/server';

const FETCH_TIMEOUT_MS = 12_000;
const TOP_COMMENTS = 8;
const COMMENT_MAX_CHARS = 600;

// Reddit requires a descriptive UA for the API; default fetch UAs get blocked.
const USER_AGENT = 'web:memoric:v1.0 (personal knowledge base)';
// Crawler UA for the OpenGraph fallback — Reddit serves og: meta to known bots.
const CRAWLER_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

type ParsedPost = { subreddit: string | null; postId: string; slug: string | null };

function parsePostUrl(url: string): ParsedPost | null {
  // Canonical URLs carry the title as a slug: /comments/<id>/<slug>/
  const comments = url.match(/reddit\.com\/r\/([^/]+)\/comments\/(\w+)(?:\/([^/?#]+))?/i);
  if (comments) return { subreddit: comments[1], postId: comments[2], slug: comments[3] ?? null };
  const shortLink = url.match(/redd\.it\/(\w+)/i);
  if (shortLink) return { subreddit: null, postId: shortLink[1], slug: null };
  return null;
}

// "you_should_bend_me_over" -> "You should bend me over". A keyless last-resort
// title when both the API and the OpenGraph scrape are blocked.
function titleFromSlug(slug: string): string {
  const words = slug.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
}

// Share links (reddit.com/r/<sub>/s/<token>) hide the post id behind a
// redirect; follow it and parse the final URL.
async function resolvePost(url: string): Promise<ParsedPost | null> {
  const direct = parsePostUrl(url);
  if (direct) return direct;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': CRAWLER_UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    return parsePostUrl(res.url);
  } catch {
    return null;
  }
}

// App-only OAuth token, cached until shortly before expiry. One token serves
// all users (it's app-level, not user-level).
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    console.warn('Reddit OAuth failed:', res.status, await res.text().catch(() => ''));
    return null;
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.token;
}

async function fetchPostJson(postId: string): Promise<unknown[] | null> {
  const query = 'limit=30&depth=1&raw_json=1';

  const token = await getAccessToken();
  if (token) {
    const res = await fetch(`https://oauth.reddit.com/comments/${postId}?${query}`, {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.ok) return (await res.json()) as unknown[];
    console.warn('Reddit OAuth request failed:', res.status);
  }

  // Keyless fallback; Reddit 403s this on many networks.
  const res = await fetch(`https://www.reddit.com/comments/${postId}.json?${query}`, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (res.ok) return (await res.json()) as unknown[];
  console.warn('Reddit public .json failed:', res.status);
  return null;
}

type RedditComment = {
  kind: string;
  data: { author?: string; body?: string; score?: number; stickied?: boolean };
};

function formatComments(children: RedditComment[]): string[] {
  return children
    .filter(
      (c) =>
        c.kind === 't1' &&
        c.data.body &&
        !c.data.stickied &&
        c.data.author !== 'AutoModerator' &&
        c.data.body !== '[deleted]' &&
        c.data.body !== '[removed]'
    )
    .sort((a, b) => (b.data.score ?? 0) - (a.data.score ?? 0))
    .slice(0, TOP_COMMENTS)
    .map((c) => {
      const body = (c.data.body ?? '').replace(/\s+/g, ' ').trim().slice(0, COMMENT_MAX_CHARS);
      return `u/${c.data.author} (${c.data.score ?? 0} points): ${body}`;
    });
}

function getMeta(html: string, property: string): string | null {
  // Tags appear as property="og:x" or name="twitter:x", attribute order varies.
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
    'i'
  );
  const m = html.match(re) ?? html.match(
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`, 'i')
  );
  if (!m) return null;
  return m[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

// Reddit's og:title is "From the <sub> community on Reddit: <title>", but when
// the page is rate-limited it degrades to a generic "From the <sub> community
// on Reddit" with no post title. Derive the cleanest title from every signal:
// the og:title body, the <title> tag ("<title> : r/<sub>"), then the URL slug.
function deriveTitle(
  rawOgTitle: string | null,
  htmlTitle: string | null,
  parsed: ParsedPost
): { title: string; subreddit: string | null } {
  const ogMatch = rawOgTitle?.match(
    /^(?:\[[^\]]+\]\s*)?From the (.+?) community on Reddit:\s*(.+)$/i
  );
  const subreddit = ogMatch?.[1] ?? parsed.subreddit ?? null;

  if (ogMatch?.[2]?.trim()) return { title: ogMatch[2].trim(), subreddit };

  const htMatch = htmlTitle?.match(/^(.+?)\s*:\s*r\/[\w-]+/i);
  if (htMatch?.[1]?.trim() && !/^reddit$/i.test(htMatch[1].trim())) {
    return { title: htMatch[1].trim(), subreddit };
  }

  if (parsed.slug) return { title: titleFromSlug(parsed.slug), subreddit };

  // Only use the raw og:title if it isn't the generic community line.
  if (rawOgTitle && !/community on Reddit\s*$/i.test(rawOgTitle) && !/^From the /i.test(rawOgTitle)) {
    return { title: rawOgTitle, subreddit };
  }
  return { title: '', subreddit };
}

// Skip Reddit's generic crawler blurbs ("Posted by …", "N subscribers in …"),
// which are noise that produces nonsense summaries.
function usefulDescription(desc: string): string {
  const d = desc.trim();
  if (!d) return '';
  if (/^Posted by\b/i.test(d)) return '';
  if (/\bsubscribers in the\b/i.test(d)) return '';
  if (/^\d[\d,.]*\s+(votes?|points?)\b/i.test(d)) return '';
  return d;
}

// Keyless fallback: scrape the post page's meta tags with a crawler UA.
async function fetchViaOpenGraph(
  url: string,
  parsed: ParsedPost
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': CRAWLER_UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const rawTitle = getMeta(html, 'og:title') || getMeta(html, 'twitter:title');
    const htmlTitle = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? null;
    const { title, subreddit } = deriveTitle(rawTitle, htmlTitle, parsed);
    if (!title) return null; // let the caller fall back to the slug-only path

    const description = usefulDescription(
      getMeta(html, 'og:description') || getMeta(html, 'twitter:description') || ''
    );
    const image = getMeta(html, 'og:image');

    const text = [
      subreddit ? `Reddit post in r/${subreddit}: ${title}` : `Reddit post: ${title}`,
      description,
    ]
      .filter(Boolean)
      .join('\n\n');

    return {
      id: parsed.postId,
      title,
      text,
      selftext: description,
      comments: [],
      author: null,
      subreddit,
      permalink: url,
      url,
      thumbnail: image && image.startsWith('http') ? image : null,
      preview: image && image.startsWith('http') ? image : null,
      partial: true, // signals OG-only data (no body/comments)
    };
  } catch (error) {
    console.warn('Reddit OpenGraph fallback failed:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const parsed = await resolvePost(url);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid Reddit URL' }, { status: 400 });
    }

    const redditData = (await fetchPostJson(parsed.postId)) as
      | { data?: { children?: { data?: Record<string, unknown> }[] } }[]
      | null;
    if (!redditData) {
      // API blocked / no credentials — scrape OpenGraph so the save still works.
      const og = await fetchViaOpenGraph(url, parsed);
      if (og) {
        return NextResponse.json({
          success: true,
          data: og,
          metadata: { platform: 'reddit', type: 'post', url, subreddit: og.subreddit, partial: true },
        });
      }
      // Last resort: derive the title from the URL slug so the saved post still
      // has a real title (Reddit blocks even the OG scrape intermittently).
      const slugTitle = parsed.slug ? titleFromSlug(parsed.slug) : '';
      if (slugTitle) {
        return NextResponse.json({
          success: true,
          data: {
            id: parsed.postId,
            title: slugTitle,
            text: parsed.subreddit
              ? `Reddit post in r/${parsed.subreddit}: ${slugTitle}`
              : `Reddit post: ${slugTitle}`,
            selftext: '',
            comments: [],
            author: null,
            subreddit: parsed.subreddit,
            permalink: url,
            url,
            thumbnail: null,
            preview: null,
            partial: true,
          },
          metadata: { platform: 'reddit', type: 'post', url, subreddit: parsed.subreddit, partial: true },
        });
      }
      return NextResponse.json(
        {
          error:
            'Reddit blocked the request. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET (free app at reddit.com/prefs/apps) for reliable access.',
        },
        { status: 502 }
      );
    }

    const post = redditData[0]?.data?.children?.[0]?.data as
      | Record<string, unknown>
      | undefined;
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const comments = formatComments(
      ((redditData[1]?.data?.children ?? []) as unknown) as RedditComment[]
    );

    const isSelfPost = Boolean(post.is_self);
    // `text` is what gets saved as the item's content (and embedded for RAG):
    // post body (or linked URL for link posts) plus the top comments.
    const text = [
      `Reddit post in r/${post.subreddit} by u/${post.author}: ${post.title}`,
      isSelfPost ? (post.selftext as string) : post.url ? `Link: ${post.url}` : '',
      comments.length ? `Top comments:\n${comments.join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const preview = post.preview as
      | { images?: { source?: { url?: string } }[] }
      | undefined;
    const thumbnail = post.thumbnail as string | undefined;

    return NextResponse.json({
      success: true,
      data: {
        id: post.id,
        title: post.title,
        text,
        selftext: post.selftext,
        comments,
        author: post.author,
        subreddit: post.subreddit,
        score: post.score,
        num_comments: post.num_comments,
        created_utc: post.created_utc,
        permalink: post.permalink,
        url: post.url,
        is_video: post.is_video,
        thumbnail: thumbnail && thumbnail.startsWith('http') ? thumbnail : null,
        preview: preview?.images?.[0]?.source?.url ?? null,
      },
      metadata: {
        platform: 'reddit',
        type: 'post',
        url,
        subreddit: post.subreddit,
      },
    });
  } catch (error) {
    console.error('Reddit API error:', error);
    return NextResponse.json({ error: 'Failed to fetch Reddit data' }, { status: 500 });
  }
}
