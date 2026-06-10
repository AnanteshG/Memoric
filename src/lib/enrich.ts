// src/lib/enrich.ts
// AI enrichment for saved content: Gemini summary + tags + insights, plus the
// semantic embedding for RAG. Designed to run in the background (next/server
// `after()`) so saving feels instant; the chat route also uses the embedding
// helper to lazily backfill rows whose background run didn't finish.
import { GoogleGenerativeAI } from '@google/generative-ai';
import { embedText, buildEmbeddingInput } from '@/lib/embeddings';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

export async function enrichAndEmbed(input: EnrichInput): Promise<EnrichResult> {
  let summary = input.content.substring(0, 200);
  let tags: string[] = [input.type];
  let processedContent = input.content;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const authorLine = input.authorName
      ? `Author: ${input.authorName}${input.authorHandle ? ` (@${input.authorHandle})` : ''}\n`
      : '';
    const prompt = `Analyze the following content and respond with JSON only:
{"summary":"2-3 sentence summary","tags":["tag1","tag2","tag3","tag4","tag5"],"insights":"key insights"}

Type: ${input.type}
${authorLine}Title: ${input.title}
Content: ${input.content}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      summary = parsed.summary || summary;
      tags = Array.isArray(parsed.tags) && parsed.tags.length ? parsed.tags : tags;
      processedContent = parsed.insights || processedContent;
    }
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
