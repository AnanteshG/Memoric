// Shared URL → content-type detection, used by the upload UI (live badge)
// and the content API (authoritative server-side typing).

export type DetectedType = 'tweet' | 'reddit' | 'youtube' | 'github' | 'website';

export function detectContentTypeFromUrl(rawUrl: string): DetectedType | null {
  let host: string;
  let path: string;
  try {
    const u = new URL(rawUrl.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    host = u.hostname.replace(/^www\./, '').toLowerCase();
    path = u.pathname;
  } catch {
    return null;
  }

  if (host === 'x.com' || host === 'twitter.com' || host === 'mobile.twitter.com') return 'tweet';
  if (host === 'reddit.com' || host.endsWith('.reddit.com') || host === 'redd.it') return 'reddit';
  if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') return 'youtube';
  // Only owner/repo paths count as repos; github.com/user profiles and
  // gists are saved as plain websites.
  if (host === 'github.com' && /^\/[\w.-]+\/[\w.-]+\/?/.test(path)) return 'github';
  return 'website';
}

export const TYPE_LABELS: Record<DetectedType, string> = {
  tweet: 'X post',
  reddit: 'Reddit post',
  youtube: 'YouTube video',
  github: 'GitHub repo',
  website: 'Website',
};
