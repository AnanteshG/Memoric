// src/lib/embeddings.ts
// Local embeddings via transformers.js — no API key, no rate limits, free for
// any number of users. nomic-embed-text-v1.5 produces 768-dim vectors (matches
// the vector(768) column) and handles long documents (8k-token context).
//
// The ONNX model (~135MB quantized) downloads from the Hugging Face Hub on
// first use and is cached on disk (set HF_HOME to control where).
import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

const EMBED_MODEL = 'nomic-ai/nomic-embed-text-v1.5';
const MAX_CHARS = 8000;

export type EmbedTask = 'document' | 'query';

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  extractorPromise ??= pipeline('feature-extraction', EMBED_MODEL, { dtype: 'q8' });
  return extractorPromise;
}

// Returns a 768-dim embedding for the text, or null on failure.
export async function embedText(
  text: string,
  task: EmbedTask = 'document'
): Promise<number[] | null> {
  const input = (text || '').trim().slice(0, MAX_CHARS);
  if (!input) return null;
  try {
    const extractor = await getExtractor();
    // nomic models are trained with task prefixes; matching document/query
    // prefixes is what makes retrieval work.
    const prefixed = `${task === 'query' ? 'search_query' : 'search_document'}: ${input}`;
    const output = await extractor(prefixed, { pooling: 'mean', normalize: true });
    const vector = (output.tolist() as number[][])[0];
    return Array.isArray(vector) && vector.length > 0 ? vector : null;
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
