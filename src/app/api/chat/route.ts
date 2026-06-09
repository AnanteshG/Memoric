// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient, getUserId } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

type ChatTurn = { message: string; response: string };

// NOTE: transitional keyword search over Postgres. This is replaced by
// pgvector semantic retrieval (match_content RPC) in the RAG step.
async function searchUserContent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  message: string
) {
  const terms = message
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .slice(0, 6);

  const cols = ['title', 'content', 'summary', 'processed_content'];
  const orFilter =
    terms.length > 0
      ? terms.flatMap((t) => cols.map((c) => `${c}.ilike.%${t}%`)).join(',')
      : '';

  let query = supabase
    .from('content')
    .select('id, title, content, summary, processed_content, type, url, tags, author, platform')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (orFilter) query = query.or(orFilter);

  const { data, error } = await query;
  if (error) {
    console.warn('Content search failed:', error.message);
    return [];
  }
  return data ?? [];
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

    // Relevant content.
    const relevant = await searchUserContent(supabase, userId, message);

    // Build context.
    let contextText = '';
    if (relevant.length > 0) {
      contextText = '\n\nRelevant information from your knowledge base:\n';
      relevant.forEach((item, i) => {
        contextText += `\n${i + 1}. ${item.title || 'Untitled'} (${item.type || 'unknown'})\n`;
        if (item.summary) contextText += `   Summary: ${item.summary}\n`;
        if (item.content) {
          contextText += `   Content: ${item.content.substring(0, 800)}${item.content.length > 800 ? '...' : ''}\n`;
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
1. Use the knowledge base content above when relevant, and cite which sources you used.
2. If nothing relevant is found, say so clearly and answer generally.
3. Be conversational and concise.
${
  relevant.length === 0
    ? 'Note: no relevant documents were found for this query.'
    : `Note: ${relevant.length} relevant document(s) are available above.`
}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    // Persist the turn.
    await supabase.from('chats').insert({
      user_id: userId,
      content_id: contentId || null,
      message,
      response: answer,
    });

    return NextResponse.json({
      answer,
      sources: relevant.map((item) => ({ title: item.title || 'Untitled', type: item.type, id: item.id })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
