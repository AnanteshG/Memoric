// src/lib/enrich.ts
// AI enrichment for saved content: summary + tags + insights via a free chat
// provider (see lib/ai.ts), plus the semantic embedding for RAG. Designed to
// run in the background (next/server `after()`) so saving feels instant; the
// chat route also uses the embedding helper to lazily backfill rows whose
// background run didn't finish.
import { chatComplete } from '@/lib/ai';
import { embedText, buildEmbeddingInput } from '@/lib/embeddings';

export interface EnrichInput {
  type: string;
  title: string;
  content: string;
  // Set for X posts so author context flows into the summary and embedding.
  authorName?: string | null;
  authorHandle?: string | null;
}

export interface EnrichResult {
  summary: string;
  tags: string[];
  processedContent: string;
  embedding: number[] | null;
}

// Real hashtags pulled from the content (e.g. #productivity in an X post).
// Tags are not AI-invented — if the content has no hashtags, there are none.
function extractHashtags(text: string): string[] {
  const matches = text.match(/(?:^|\s)#(\w{2,30})/g) ?? [];
  const seen = new Set<string>();
  for (const m of matches) {
    const tag = m.trim().replace(/^#/, '').toLowerCase();
    if (tag && !/^\d+$/.test(tag)) seen.add(tag); // skip bare numbers (#1)
  }
  return [...seen].slice(0, 8);
}

// A summary that's just the prompt's example echoed back by a weak model.
function isPlaceholderSummary(s: string): boolean {
  const t = s.trim().toLowerCase();
  return !t || t === '2-3 sentence summary' || t === '2-3 line summary' || t === 'summary';
}

export async function enrichAndEmbed(input: EnrichInput): Promise<EnrichResult> {
  // No AI-invented tags — only genuine hashtags found in the content.
  const tags = extractHashtags(`${input.title}\n${input.content}`);
  let summary = '';
  const processedContent = input.content;

  // Thin content (a short note/tweet, or a keyless Reddit post that's just the
  // title) doesn't need a summary — and summarizing it only invites the model
  // to hallucinate. The content itself is the summary in that case.
  const summarizable = input.content.trim().length >= 200;

  if (summarizable) try {
    const authorLine = input.authorName
      ? `Author: ${input.authorName}${input.authorHandle ? ` (@${input.authorHandle})` : ''}\n`
      : '';
    const prompt = `Write a concise 2-3 sentence summary of the content below. Respond with ONLY the summary text — no labels, no quotes, no preamble, no markdown.

Type: ${input.type}
${authorLine}Title: ${input.title}
Content: ${input.content.slice(0, 12000)}`;
    const text = (await chatComplete(prompt, { fast: true })).trim();
    if (!isPlaceholderSummary(text)) summary = text;
  } catch (error) {
    console.warn('AI enrichment failed, using fallback:', error);
  }

  const embedding = await embedText(
    buildEmbeddingInput({
      title: input.title,
      summary,
      tags,
      content: buildAuthorPrefixedContent(input.authorName, input.authorHandle, input.content, processedContent),
    })
  );

  return { summary, tags, processedContent, embedding };
}

// For X posts, embed the author alongside the text so questions like
// "what did <person> say about X" retrieve the right posts.
export function buildAuthorPrefixedContent(
  authorName: string | null | undefined,
  authorHandle: string | null | undefined,
  content: string,
  processedContent?: string
): string {
  const body = processedContent && processedContent !== content ? `${content}\n\n${processedContent}` : content;
  return authorName ? `X post by ${authorName} (@${authorHandle || 'x_user'}):\n${body}` : body;
}
