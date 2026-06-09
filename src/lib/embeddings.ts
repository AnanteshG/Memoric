import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// gemini-embedding-001 supports Matryoshka truncation; we request 768 dims to
// match the vector(768) column. Cosine distance (pgvector <=>) is scale-
// invariant, so the truncated (non-normalized) vectors are fine for retrieval.
const EMBED_MODEL = 'gemini-embedding-001';
const DIMS = 768;
const MAX_CHARS = 8000; // keep under the model's token limit

// Returns a 768-dim embedding for the text, or null on failure.
export async function embedText(
  text: string,
  taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT
): Promise<number[] | null> {
  const input = (text || '').trim().slice(0, MAX_CHARS);
  if (!input) return null;
  try {
    const model = genAI.getGenerativeModel({ model: EMBED_MODEL });
    // `outputDimensionality` is supported by the API but missing from this
    // SDK version's types, so the request is cast.
    const request = {
      content: { role: 'user', parts: [{ text: input }] },
      taskType,
      outputDimensionality: DIMS,
    };
    const result = await model.embedContent(
      request as unknown as Parameters<typeof model.embedContent>[0]
    );
    return result.embedding?.values ?? null;
  } catch (error) {
    console.warn('Embedding failed:', error);
    return null;
  }
}

// Builds the text we embed for a content item: the fields that carry meaning.
export function buildEmbeddingInput(parts: {
  title?: string | null;
  summary?: string | null;
  tags?: string[] | null;
  content?: string | null;
}): string {
  return [
    parts.title || '',
    parts.summary || '',
    (parts.tags || []).join(' '),
    parts.content || '',
  ]
    .filter(Boolean)
    .join('\n');
}
