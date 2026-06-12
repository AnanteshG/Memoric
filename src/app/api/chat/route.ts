// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUserId } from '@/lib/supabase/server';
import { chatComplete } from '@/lib/ai';
import { embedText, buildEmbeddingInput } from '@/lib/embeddings';
import { buildAuthorPrefixedContent } from '@/lib/enrich';

export const dynamic = 'force-dynamic';

type ChatTurn = { message: string; response: string };
type Hit = {
  id: string;
  title: string | null;
  content: string | null;
  summary: string | null;
  type: string | null;
  url: string | null;
  similarity?: number;
};

// Cosine-similarity floor for a hit to count as an actual match. nomic-embed
// has a high baseline (unrelated text still scores ~0.4-0.5; genuinely related
// pairs score ~0.65+), so the floor must be high or every pin looks "related".
const MIN_SIMILARITY = 0.6;
// Never surface more than a handful of pins as sources for one question.
const MAX_SOURCES = 3;

// The chat bubble renders plain text, so markdown the model emits despite the
// prompt instruction would show as literal ** and # characters.
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold**
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|[.,!?]|$)/g, '$1$2') // *italic*
    .replace(/^\s*[*-]\s+/gm, '• ') // bullet lists
    .replace(/^#{1,6}\s+/gm, '') // headers
    .replace(/`([^`]+)`/g, '$1') // inline code
    .trim();
}

type Supa = Awaited<ReturnType<typeof createClient>>;

// Semantic retrieval via pgvector (match_content RPC). Returns [] if the query
// can't be embedded or no rows have embeddings yet.
async function semanticSearch(supabase: Supa, message: string): Promise<Hit[]> {
  const queryEmbedding = await embedText(message, 'query');
  if (!queryEmbedding) return [];

  const { data, error } = await supabase.rpc('match_content', {
    query_embedding: queryEmbedding,
    match_count: 10,
  });
  if (error) {
    console.warn('Vector search failed, falling back to keyword:', error.message);
    return [];
  }
  return ((data ?? []) as Hit[])
    .filter((hit) => typeof hit.similarity === 'number' && hit.similarity >= MIN_SIMILARITY)
    .slice(0, MAX_SOURCES);
}

// Keyword fallback over Postgres (for items without embeddings, or if vector
// search returns nothing).
async function keywordSearch(supabase: Supa, userId: string, message: string): Promise<Hit[]> {
  const terms = message
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .slice(0, 6);

  // No usable search terms → nothing to match. Return [] rather than falling
  // through to "every recent pin", which is what made chat list all pins.
  if (terms.length === 0) return [];

  const cols = ['title', 'content', 'summary', 'processed_content'];
  const orFilter = terms.flatMap((t) => cols.map((c) => `${c}.ilike.%${t}%`)).join(',');

  const { data, error } = await supabase
    .from('content')
    .select('id, title, content, summary, type, url')
    .eq('user_id', userId)
    .or(orFilter)
    .order('created_at', { ascending: false })
    .limit(MAX_SOURCES);
  if (error) {
    console.warn('Keyword search failed:', error.message);
    return [];
  }
  return (data ?? []) as Hit[];
}

// Retrieve relevant content: semantic first, keyword as fallback.
async function retrieveContent(supabase: Supa, userId: string, message: string): Promise<Hit[]> {
  const semantic = await semanticSearch(supabase, message);
  if (semantic.length > 0) return semantic;
  return keywordSearch(supabase, userId, message);
}

// Embeddings are generated in the background after a save; if any didn't make
// it (server restart, transient API failure), embed them now so retrieval
// covers every saved item. Capped per request to keep chat latency bounded.
async function backfillMissingEmbeddings(supabase: Supa, userId: string): Promise<void> {
  const { data: rows, error } = await supabase
    .from('content')
    .select('id, title, summary, tags, content, processed_content, metadata')
    .eq('user_id', userId)
    .is('embedding', null)
    .limit(10);
  if (error || !rows?.length) return;

  await Promise.all(
    rows.map(async (row) => {
      const tweetData = (row.metadata as Record<string, unknown> | null)?.tweetData as
        | { username?: string; handle?: string }
        | undefined;
      const embedding = await embedText(
        buildEmbeddingInput({
          title: row.title,
          summary: row.summary,
          tags: row.tags,
          content: buildAuthorPrefixedContent(
            tweetData?.username,
            tweetData?.handle,
            row.content || '',
            row.processed_content || ''
          ),
        })
      );
      if (embedding) {
        await supabase.from('content').update({ embedding }).eq('id', row.id).eq('user_id', userId);
      }
    })
  );
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, contentId } = await req.json();
    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    const supabase = await createClient();

    // Recent chat history.
    let historyQuery = supabase
      .from('chats')
      .select('message, response, content_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    if (contentId) historyQuery = historyQuery.eq('content_id', contentId);
    const { data: historyRows } = await historyQuery;
    const chatHistory: ChatTurn[] = (historyRows ?? []).reverse();

    // Make sure every saved item is in the vector index, then retrieve.
    await backfillMissingEmbeddings(supabase, userId);
    const relevant = await retrieveContent(supabase, userId, message);

    // Build context.
    let contextText = '';
    if (relevant.length > 0) {
      contextText = '\n\nRelevant information from your knowledge base:\n';
      relevant.forEach((item, i) => {
        contextText += `\n${i + 1}. ${item.title || 'Untitled'} (${item.type || 'unknown'})\n`;
        if (item.summary) contextText += `   Summary: ${item.summary}\n`;
        if (item.content) {
          // Generous slice so long-form content (READMEs, articles) actually
          // reaches the model, not just its first paragraph.
          contextText += `   Content: ${item.content.substring(0, 2000)}${item.content.length > 2000 ? '...' : ''}\n`;
        }
        if (item.url) contextText += `   Source: ${item.url}\n`;
      });
    }

    let historyText = '';
    if (chatHistory.length > 0) {
      historyText = '\n\nRecent conversation:\n';
      chatHistory.forEach((turn) => {
        historyText += `User: ${turn.message}\nAssistant: ${turn.response}\n\n`;
      });
    }

    const prompt = `You are Memoric, an AI assistant for the user's personal knowledge base.

User's question: ${message}
${contextText}
${historyText}

Instructions:
1. Answer in 2-4 short sentences. Be direct — lead with the answer, no preamble or filler.
2. Base the answer on the knowledge base content above when relevant. Do NOT list or restate the sources; they are shown to the user separately.
3. If nothing relevant is found, say so in one sentence, then answer briefly from general knowledge.
4. Plain text only — no markdown, asterisks, backticks or # headers. Use "• " only if a short list is truly needed.
${
  relevant.length === 0
    ? 'Note: no relevant documents were found for this query.'
    : `Note: ${relevant.length} relevant document(s) are available above.`
}`;

    // Cap the completion so answers stay short even if the model rambles.
    const answer = stripMarkdown(await chatComplete(prompt, { maxTokens: 300 }));

    // Persist the turn.
    await supabase.from('chats').insert({
      user_id: userId,
      content_id: contentId || null,
      message,
      response: answer,
    });

    return NextResponse.json({
      answer,
      sources: relevant.map((item) => ({
        title: item.title || 'Untitled',
        type: item.type,
        id: item.id,
        url: item.url || null,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
