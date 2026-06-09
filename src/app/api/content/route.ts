// src/app/api/content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient, getUserId } from '@/lib/supabase/server';
import { rowToContent } from '@/lib/content';
import { embedText, buildEmbeddingInput } from '@/lib/embeddings';

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const VALID_TYPES = ['note', 'tweet', 'x', 'document', 'website', 'image', 'youtube', 'reddit', 'text'];

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
      query = query.eq('type', type);
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
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, type, url, title, metadata } = await req.json();

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const supabase = await createClient();

    let finalContent = content || '';
    let finalTitle = title || '';
    let externalData: Record<string, unknown> | null = null;

    // Fetch external data for known link types.
    if (url) {
      try {
        let endpoint: string | null = null;
        if ((type === 'tweet' || type === 'x') && (url.includes('twitter.com') || url.includes('x.com'))) {
          endpoint = '/api/external/x';
        } else if (type === 'reddit' && url.includes('reddit.com')) {
          endpoint = '/api/external/reddit';
        } else if (type === 'youtube' && (url.includes('youtube.com') || url.includes('youtu.be'))) {
          endpoint = '/api/external/youtube';
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
            finalContent =
              finalContent ||
              (externalData?.text as string) ||
              (externalData?.selftext as string) ||
              (externalData?.description as string) ||
              '';
          }
        }
      } catch (externalError) {
        console.warn('External fetch failed, using user content:', externalError);
      }
    }

    // Dedupe link-based content by URL.
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

    if (!finalContent.trim() && url) {
      finalContent = url;
    }
    if (!finalContent.trim()) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    // AI enrichment: summary + tags.
    let summary = '';
    let tags: string[] = [];
    let processedContent = finalContent;
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Analyze the following content and respond with JSON only:
{"summary":"2-3 sentence summary","tags":["tag1","tag2","tag3","tag4","tag5"],"insights":"key insights"}

Type: ${type}
Title: ${finalTitle}
Content: ${finalContent}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        summary = parsed.summary || finalContent.substring(0, 200);
        tags = Array.isArray(parsed.tags) && parsed.tags.length ? parsed.tags : [type];
        processedContent = parsed.insights || finalContent;
      }
    } catch (aiError) {
      console.warn('AI enrichment failed, using fallback:', aiError);
      summary = finalContent.substring(0, 200);
      tags = [type];
    }

    if (!finalTitle) {
      finalTitle = finalContent.substring(0, 60) || `${type} content`;
    }

    const platform =
      type === 'tweet' || type === 'x'
        ? 'X'
        : type === 'reddit'
        ? 'Reddit'
        : type === 'youtube'
        ? 'YouTube'
        : null;

    const authorObj = externalData?.author as Record<string, unknown> | undefined;
    const rowMetadata: Record<string, unknown> = { ...(metadata || {}) };
    if ((type === 'tweet' || type === 'x') && externalData) {
      rowMetadata.tweetData = {
        id: externalData.id,
        text: externalData.text,
        username: authorObj?.name || 'X User',
        handle: authorObj?.username || 'x_user',
        timestamp: externalData.created_at || new Date().toISOString(),
        metrics: externalData.public_metrics || {},
        url: url || '',
      };
    }

    // Semantic embedding for RAG retrieval (null if it fails — non-blocking).
    const embedding = await embedText(
      buildEmbeddingInput({ title: finalTitle, summary, tags, content: processedContent })
    );

    const insertRow = {
      user_id: userId,
      type,
      title: finalTitle,
      content: finalContent,
      processed_content: processedContent,
      summary,
      tags,
      embedding,
      original_link: url || null,
      url: url || null,
      author: (authorObj?.name as string) || (externalData?.channelTitle as string) || null,
      platform,
      thumbnail:
        (externalData?.thumbnails as Record<string, Record<string, string>>)?.medium?.url ||
        (externalData?.thumbnail as string) ||
        null,
      metadata: rowMetadata,
      external_data: externalData,
      metrics: {
        likes: externalData?.like_count || (externalData?.public_metrics as Record<string, number>)?.like_count || 0,
        views: externalData?.viewCount || 0,
        comments: externalData?.num_comments || externalData?.commentCount || 0,
        score: externalData?.score || 0,
      },
    };

    const { data: inserted, error: insertError } = await supabase
      .from('content')
      .insert(insertRow)
      .select('*')
      .single();
    if (insertError) throw insertError;

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
