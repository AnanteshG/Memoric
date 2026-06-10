// src/app/api/content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient, createAdminClient, getUserId } from '@/lib/supabase/server';
import { rowToContent } from '@/lib/content';
import { enrichAndEmbed } from '@/lib/enrich';
import { detectContentTypeFromUrl } from '@/lib/contentType';

export const dynamic = 'force-dynamic';

const VALID_TYPES = ['note', 'tweet', 'x', 'document', 'website', 'image', 'youtube', 'reddit', 'text', 'github'];

// ---------------------------------------------------------------------------
// GET: list the user's content (optional ?type= and ?search=)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const supabase = await createClient();
    let query = supabase
      .from('content')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (type && type !== 'all') {
      // Rows saved before migration 0002 stored repos as website+GitHub.
      if (type === 'github') query = query.or('type.eq.github,platform.eq.GitHub');
      else query = query.eq('type', type);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    let content = (rows ?? []).map(rowToContent);

    if (search) {
      const s = search.toLowerCase();
      content = content.filter(
        (item) =>
          item.title.toLowerCase().includes(s) ||
          item.content.toLowerCase().includes(s) ||
          item.summary.toLowerCase().includes(s) ||
          item.tags.some((t) => t.toLowerCase().includes(s))
      );
    }

    return NextResponse.json({ success: true, data: content, total: content.length });
  } catch (error) {
    console.error('Get content error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST: create content (note / link / etc.)
//
// The row is inserted and returned immediately; AI enrichment (summary, tags,
// insights) and the RAG embedding run in the background via `after()` so the
// save feels instant. The chat route lazily backfills any embedding that
// didn't make it (e.g. server restarted mid-task).
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { content, url, title, metadata } = body;
    // The URL is the source of truth for the type — the client just pastes a
    // link and the bucket (tweet/reddit/youtube/github/website) is detected.
    const type: string = (url && detectContentTypeFromUrl(url)) || body.type;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const supabase = await createClient();

    // Dedupe link-based content by URL before any slow work.
    if (url) {
      const { data: existing } = await supabase
        .from('content')
        .select('id')
        .eq('user_id', userId)
        .eq('original_link', url)
        .limit(1);
      if (existing && existing.length > 0) {
        return NextResponse.json({ error: 'This link is already saved' }, { status: 409 });
      }
    }

    let finalContent = content || '';
    let finalTitle = title || '';
    let externalData: Record<string, unknown> | null = null;

    // Fetch external data for known link types.
    if (url) {
      try {
        let endpoint: string | null = null;
        if (type === 'tweet' || type === 'x') {
          endpoint = '/api/external/x';
        } else if (type === 'reddit') {
          endpoint = '/api/external/reddit';
        } else if (type === 'youtube') {
          endpoint = '/api/external/youtube';
        } else if (type === 'github') {
          endpoint = '/api/external/github';
        } else if (type === 'website') {
          endpoint = '/api/external/website';
        }

        if (endpoint) {
          // Derive the base URL from the incoming request so internal calls
          // work in any environment (localhost, Vercel, custom domain).
          const origin = req.nextUrl.origin;
          const response = await fetch(`${origin}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });
          if (response.ok) {
            const result = await response.json();
            externalData = result.data;
            finalTitle = finalTitle || (externalData?.title as string) || '';

            // The fetched post text is the content; a user-typed note is
            // appended rather than replacing it. A "note" that is just the
            // URL echoed back (old client behavior) is ignored.
            const externalText =
              ((externalData?.text as string) ||
                (externalData?.selftext as string) ||
                (externalData?.description as string) ||
                '').trim();
            const userNote = finalContent.trim();
            const noteIsJustUrl = userNote === String(url).trim();
            if (externalText) {
              finalContent =
                userNote && !noteIsJustUrl ? `${externalText}\n\nMy note: ${userNote}` : externalText;
            }
          }
        }
      } catch (externalError) {
        console.warn('External fetch failed, using user content:', externalError);
      }
    }

    if (!finalContent.trim() && url) {
      finalContent = url;
    }
    if (!finalContent.trim()) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    const isTweet = type === 'tweet' || type === 'x';
    const authorObj = externalData?.author as Record<string, unknown> | undefined;

    if (!finalTitle) {
      finalTitle =
        isTweet && authorObj?.name
          ? `${authorObj.name} (@${authorObj.username}) on X`
          : finalContent.substring(0, 60) || `${type} content`;
    }

    const platform =
      type === 'tweet' || type === 'x'
        ? 'X'
        : type === 'reddit'
        ? 'Reddit'
        : type === 'youtube'
        ? 'YouTube'
        : type === 'github'
        ? 'GitHub'
        : null;

    const publicMetrics = (externalData?.public_metrics ?? {}) as Record<string, number>;
    const tweetImages = (externalData?.images as string[] | undefined) ?? [];
    const rowMetadata: Record<string, unknown> = { ...(metadata || {}) };
    if (isTweet && externalData) {
      // Normalized to the shape XCard renders: metrics.{likes,retweets,replies,views}.
      rowMetadata.tweetData = {
        id: externalData.id,
        text: externalData.text,
        username: authorObj?.name || 'X User',
        handle: authorObj?.username || 'x_user',
        avatar: authorObj?.profile_image_url || null,
        timestamp: externalData.created_at || new Date().toISOString(),
        metrics: {
          likes: publicMetrics.like_count ?? 0,
          retweets: publicMetrics.repost_count ?? 0,
          replies: publicMetrics.reply_count ?? 0,
          views: publicMetrics.view_count ?? 0,
        },
        images: tweetImages,
        url: url || '',
      };
    }

    const insertRow = {
      user_id: userId,
      type,
      title: finalTitle,
      content: finalContent,
      // Placeholder values; the background enrichment below fills these in.
      processed_content: finalContent,
      summary: '',
      tags: [type],
      embedding: null,
      original_link: url || null,
      url: url || null,
      author: (authorObj?.name as string) || (externalData?.channelTitle as string) || null,
      platform,
      thumbnail:
        (externalData?.thumbnails as Record<string, Record<string, string>>)?.medium?.url ||
        (externalData?.thumbnail as string) ||
        tweetImages[0] ||
        null,
      metadata: rowMetadata,
      external_data: externalData,
      metrics: {
        likes: externalData?.like_count || publicMetrics.like_count || 0,
        views: externalData?.viewCount || publicMetrics.view_count || 0,
        comments: externalData?.num_comments || externalData?.commentCount || publicMetrics.reply_count || 0,
        score: externalData?.score || externalData?.stars || 0,
      },
    };

    let { data: inserted, error: insertError } = await supabase
      .from('content')
      .insert(insertRow)
      .select('*')
      .single();
    // DBs without migration 0002 don't allow type 'github' yet; store as
    // website (platform stays 'GitHub', which the github filter also matches).
    if (insertError?.code === '23514' && type === 'github') {
      ({ data: inserted, error: insertError } = await supabase
        .from('content')
        .insert({ ...insertRow, type: 'website' })
        .select('*')
        .single());
    }
    if (insertError || !inserted) throw insertError ?? new Error('Insert returned no row');

    // AI enrichment + embedding after the response is sent. Uses the
    // service-role client because the request's auth cookies are gone by then.
    after(async () => {
      try {
        const { summary, tags, processedContent, embedding } = await enrichAndEmbed({
          type,
          title: finalTitle,
          content: finalContent,
          authorName: isTweet ? ((authorObj?.name as string) ?? null) : null,
          authorHandle: isTweet ? ((authorObj?.username as string) ?? null) : null,
        });
        const admin = createAdminClient();
        const { error: updateError } = await admin
          .from('content')
          .update({ summary, tags, processed_content: processedContent, embedding })
          .eq('id', inserted.id)
          .eq('user_id', userId);
        if (updateError) throw updateError;
      } catch (error) {
        console.warn('Background enrichment failed for', inserted.id, error);
      }
    });

    return NextResponse.json(
      { success: true, message: 'Content saved', data: rowToContent(inserted) },
      { status: 201 }
    );
  } catch (error) {
    console.error('Content creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE: remove content by id (body: { contentId })
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentId } = await req.json();
    if (!contentId) {
      return NextResponse.json({ error: 'contentId is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: deleted, error } = await supabase
      .from('content')
      .delete()
      .eq('id', contentId)
      .eq('user_id', userId)
      .select('id');
    if (error) throw error;

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Content deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
