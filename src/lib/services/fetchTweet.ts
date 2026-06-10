// src/lib/services/fetchTweet.ts
//
// Fetches real tweet data without Twitter API credentials, using the public
// FxTwitter API (primary) with VxTwitter as a fallback. Results are cached
// in-memory per server instance.

const tweetCache: { [key: string]: TweetData } = {};

const FETCH_TIMEOUT_MS = 10_000;

export interface TweetData {
  id: string;
  text: string;
  username: string; // display name, e.g. "Elon Musk"
  handle: string; // screen name without @, e.g. "elonmusk"
  avatar?: string;
  timestamp: string; // ISO 8601
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    views?: number;
  };
  images: string[]; // photo URLs (video posts contribute their thumbnail)
  url: string;
}

/**
 * Extract tweet ID from a tweet URL.
 */
function extractTweetId(tweetUrl: string): string | null {
  const match = tweetUrl.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match ? match[1] : null;
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Memoric/1.0 (personal knowledge base)' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch (error) {
    console.warn(`Tweet fetch failed for ${url}:`, error);
    return null;
  }
}

// https://api.fxtwitter.com/status/<id> — rich payload: full text, author
// (name/handle/avatar), counts, and media with video thumbnails.
async function fetchFromFxTwitter(tweetId: string, originalUrl: string): Promise<TweetData | null> {
  const json = await fetchJson(`https://api.fxtwitter.com/status/${tweetId}`);
  const tweet = json?.tweet as Record<string, unknown> | undefined;
  if (json?.code !== 200 || !tweet) return null;

  const author = (tweet.author ?? {}) as Record<string, unknown>;
  const media = (tweet.media as Record<string, unknown> | undefined)?.all as
    | Array<Record<string, unknown>>
    | undefined;

  const images = (media ?? [])
    .map((m) => (m.type === 'photo' ? m.url : m.thumbnail_url))
    .filter((u): u is string => typeof u === 'string');

  const createdTs = typeof tweet.created_timestamp === 'number' ? tweet.created_timestamp : null;

  return {
    id: tweetId,
    text: (tweet.text as string) || '',
    username: (author.name as string) || (author.screen_name as string) || 'X User',
    handle: (author.screen_name as string) || 'x_user',
    avatar: (author.avatar_url as string) || undefined,
    timestamp: createdTs ? new Date(createdTs * 1000).toISOString() : new Date().toISOString(),
    metrics: {
      likes: (tweet.likes as number) ?? 0,
      retweets: (tweet.retweets as number) ?? 0,
      replies: (tweet.replies as number) ?? 0,
      views: (tweet.views as number) ?? undefined,
    },
    images,
    url: (tweet.url as string) || originalUrl,
  };
}

// https://api.vxtwitter.com/i/status/<id> — fallback with the same essentials.
async function fetchFromVxTwitter(tweetId: string, originalUrl: string): Promise<TweetData | null> {
  const json = await fetchJson(`https://api.vxtwitter.com/i/status/${tweetId}`);
  if (!json || typeof json.text !== 'string') return null;

  const mediaExtended = (json.media_extended ?? []) as Array<Record<string, unknown>>;
  const images = mediaExtended
    .map((m) => (m.type === 'image' ? m.url : m.thumbnail_url))
    .filter((u): u is string => typeof u === 'string');

  const dateEpoch = typeof json.date_epoch === 'number' ? json.date_epoch : null;

  return {
    id: tweetId,
    text: json.text,
    username: (json.user_name as string) || (json.user_screen_name as string) || 'X User',
    handle: (json.user_screen_name as string) || 'x_user',
    avatar: (json.user_profile_image_url as string) || undefined,
    timestamp: dateEpoch ? new Date(dateEpoch * 1000).toISOString() : new Date().toISOString(),
    metrics: {
      likes: (json.likes as number) ?? 0,
      retweets: (json.retweets as number) ?? 0,
      replies: (json.replies as number) ?? 0,
    },
    images,
    url: (json.tweetURL as string) || originalUrl,
  };
}

/**
 * Fetch full tweet data for a tweet URL.
 * @returns The tweet data, or null if every source failed.
 */
export async function fetchTweetText(tweetUrl: string): Promise<TweetData | null> {
  const tweetId = extractTweetId(tweetUrl);
  if (!tweetId) {
    console.log('Could not extract tweet ID from URL:', tweetUrl);
    return null;
  }

  if (tweetCache[tweetId]) {
    return tweetCache[tweetId];
  }

  const tweetData =
    (await fetchFromFxTwitter(tweetId, tweetUrl)) ??
    (await fetchFromVxTwitter(tweetId, tweetUrl));

  if (tweetData) {
    tweetCache[tweetId] = tweetData;
    return tweetData;
  }
  return null;
}

/**
 * Retry wrapper with exponential backoff for fetching tweet data.
 */
export async function fetchTweetTextWithRetry(
  tweetUrl: string,
  retries: number = 3,
  delay: number = 1000
): Promise<TweetData | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const tweetData = await fetchTweetText(tweetUrl);
    if (tweetData) return tweetData;
    if (attempt < retries) {
      console.warn(`Tweet fetch attempt ${attempt} failed. Retrying in ${delay} ms…`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  return null;
}
