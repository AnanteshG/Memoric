// src/app/api/external/youtube/route.ts
// YouTube fetcher that works without any API key: metadata and caption tracks
// come from the InnerTube player endpoint using the ANDROID client (the web
// client's caption URLs require a proof-of-origin token and return empty
// bodies; the Android client's don't). oEmbed is the metadata fallback. The
// transcript becomes the RAG-able content. If YOUTUBE_API_KEY is set, the
// Data API adds stats (likes/comments) and the publish date.
import { NextRequest, NextResponse } from 'next/server';

const FETCH_TIMEOUT_MS = 12_000;
// Stored transcript cap. Embeddings/chat slice further; this just keeps rows sane.
const TRANSCRIPT_MAX_CHARS = 20_000;

function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/
  );
  return match?.[1] ?? null;
}

type CaptionTrack = { baseUrl?: string; languageCode?: string; kind?: string };

type PlayerResponse = {
  videoDetails?: {
    title?: string;
    shortDescription?: string;
    author?: string;
    lengthSeconds?: string;
    viewCount?: string;
    keywords?: string[];
  };
  captions?: {
    playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] };
  };
};

async function fetchPlayerResponse(videoId: string): Promise<PlayerResponse | null> {
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({
        context: {
          client: { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 30 },
        },
        videoId,
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as PlayerResponse;
  } catch (error) {
    console.warn('YouTube player endpoint failed:', error);
    return null;
  }
}

// Prefer a human-made English track, then auto-generated English, then whatever
// the video has (better a non-English transcript than none).
function pickCaptionTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  if (!tracks.length) return null;
  const en = tracks.filter((t) => (t.languageCode ?? '').startsWith('en'));
  return en.find((t) => t.kind !== 'asr') ?? en[0] ?? tracks[0];
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

// Caption bodies arrive as json3 or as srv3/timedtext XML depending on what
// the track URL honors; handle both.
function parseCaptionBody(body: string): string {
  let text = '';
  if (body.trimStart().startsWith('{')) {
    try {
      const data = JSON.parse(body) as { events?: { segs?: { utf8?: string }[] }[] };
      text = (data.events ?? [])
        .flatMap((e) => e.segs ?? [])
        .map((s) => s.utf8 ?? '')
        .join(' ');
    } catch {
      return '';
    }
  } else {
    text = decodeXmlEntities(body.replace(/<[^>]+>/g, ' '));
    text = text.replace(/^<\?xml[^?]*\?>/, '');
  }
  return text.replace(/\s+/g, ' ').trim();
}

async function fetchTranscript(playerResponse: PlayerResponse): Promise<string | null> {
  try {
    const tracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    const track = pickCaptionTrack(tracks);
    if (!track?.baseUrl) return null;

    const res = await fetch(`${track.baseUrl}&fmt=json3`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const text = parseCaptionBody(await res.text());
    return text ? text.slice(0, TRANSCRIPT_MAX_CHARS) : null;
  } catch (error) {
    console.warn('Transcript fetch failed:', error);
    return null;
  }
}

// Keyless official endpoint: title, channel and thumbnail for any public video.
async function fetchOEmbed(videoId: string): Promise<Record<string, string> | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`
      )}&format=json`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
    );
    if (!res.ok) return null;
    return (await res.json()) as Record<string, string>;
  } catch {
    return null;
  }
}

type DataApiVideo = {
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: Record<string, { url: string }>;
    tags?: string[];
  };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
  contentDetails?: { duration?: string };
};

async function fetchDataApi(videoId: string, apiKey: string): Promise<DataApiVideo | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,statistics,contentDetails`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data.items?.[0] as DataApiVideo) ?? null;
  } catch (error) {
    console.warn('YouTube Data API failed:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    const [playerResponse, apiVideo] = await Promise.all([
      fetchPlayerResponse(videoId),
      apiKey ? fetchDataApi(videoId, apiKey) : Promise.resolve(null),
    ]);

    const details = playerResponse?.videoDetails ?? {};
    const oembed = playerResponse || apiVideo ? null : await fetchOEmbed(videoId);

    const title = apiVideo?.snippet?.title || details.title || oembed?.title || '';
    if (!title) {
      return NextResponse.json({ error: 'Video not found or unavailable' }, { status: 502 });
    }

    const description = apiVideo?.snippet?.description || details.shortDescription || '';
    const channelTitle =
      apiVideo?.snippet?.channelTitle || details.author || oembed?.author_name || '';
    const transcript = playerResponse ? await fetchTranscript(playerResponse) : null;

    // `text` is what gets saved as the item's content (and embedded for RAG):
    // the description plus the transcript beats the description alone.
    const text = [
      channelTitle ? `YouTube video by ${channelTitle}: ${title}` : title,
      description,
      transcript ? `Transcript:\n${transcript}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const lengthSeconds = Number(details.lengthSeconds || 0);
    const duration =
      apiVideo?.contentDetails?.duration ||
      (lengthSeconds ? `PT${Math.floor(lengthSeconds / 60)}M${lengthSeconds % 60}S` : null);

    return NextResponse.json({
      success: true,
      data: {
        id: videoId,
        title,
        text,
        description,
        transcript,
        channelTitle,
        publishedAt: apiVideo?.snippet?.publishedAt || null,
        thumbnails: apiVideo?.snippet?.thumbnails || {
          default: { url: `https://img.youtube.com/vi/${videoId}/default.jpg` },
          medium: { url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` },
          high: { url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` },
          maxres: { url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` },
        },
        duration,
        viewCount: apiVideo?.statistics?.viewCount || details.viewCount || null,
        likeCount: apiVideo?.statistics?.likeCount || null,
        commentCount: apiVideo?.statistics?.commentCount || null,
        tags: apiVideo?.snippet?.tags || details.keywords || [],
      },
      metadata: {
        platform: 'youtube',
        type: 'video',
        url,
        videoId,
        hasTranscript: Boolean(transcript),
      },
    });
  } catch (error) {
    console.error('YouTube API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch YouTube data' },
      { status: 500 }
    );
  }
}
