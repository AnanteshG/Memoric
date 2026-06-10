// src/app/api/external/website/route.ts
// Generic link fetcher: pulls the page title, meta/OpenGraph description and
// preview image so any URL can be saved with meaningful, RAG-able content.
import { NextRequest, NextResponse } from 'next/server';

const FETCH_TIMEOUT_MS = 10_000;
const HTML_MAX_BYTES = 300_000;

function extractMeta(html: string, attr: 'property' | 'name', key: string): string | null {
  // Matches both attribute orders: <meta property="og:x" content="..."> and
  // <meta content="..." property="og:x">.
  const re1 = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${key}["']`, 'i');
  return html.match(re1)?.[1] ?? html.match(re2)?.[1] ?? null;
}

// Fallback when a page has no meta description: first chunk of visible body
// text, so the saved item still has something meaningful to embed and search.
function extractBodyText(html: string): string {
  const body = html.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(?:nav|header|footer|aside)[\s\S]*?<\/(?:nav|header|footer|aside)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1500);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x?\d+;|&#\d+;/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let title = '';
    let description = '';
    let thumbnail: string | null = null;
    let siteName: string | null = null;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Memoric/1.0; personal knowledge base)',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        redirect: 'follow',
      });
      const contentType = res.headers.get('content-type') ?? '';
      if (res.ok && contentType.includes('html')) {
        const html = (await res.text()).slice(0, HTML_MAX_BYTES);
        title =
          extractMeta(html, 'property', 'og:title') ??
          html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ??
          '';
        description =
          extractMeta(html, 'property', 'og:description') ??
          extractMeta(html, 'name', 'description') ??
          '';
        thumbnail = extractMeta(html, 'property', 'og:image');
        siteName = extractMeta(html, 'property', 'og:site_name');
        title = decodeEntities(title);
        description = decodeEntities(description) || decodeEntities(extractBodyText(html));
      }
    } catch (fetchError) {
      console.warn('Website fetch failed, saving URL only:', fetchError);
    }

    // Fall back to a hostname-based title so the card is never blank.
    if (!title) {
      try {
        title = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        title = url;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        title,
        description: [description, siteName ? `Site: ${siteName}` : ''].filter(Boolean).join('\n'),
        thumbnail,
        siteName,
        url,
      },
      metadata: { platform: 'website', type: 'link', url },
    });
  } catch (error) {
    console.error('Website fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch website data' }, { status: 500 });
  }
}
