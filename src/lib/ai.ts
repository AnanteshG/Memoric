// src/lib/ai.ts
// Chat completions via free OpenAI-compatible providers (Gemini replacement).
//
// Every provider below has a genuinely free ongoing tier and speaks the OpenAI
// /chat/completions protocol, so one client covers them all. Configure any
// subset of keys; requests try providers in order and fall through on rate
// limits (429) or outages, which is what lets several users share the app on
// free tiers.
//
//   AI_API_KEY + AI_BASE_URL + AI_MODEL   custom/override provider (optional)
//   GROQ_API_KEY                          https://console.groq.com  (recommended)
//   CEREBRAS_API_KEY                      https://cloud.cerebras.ai
//   OPENROUTER_API_KEY                    https://openrouter.ai
//   MISTRAL_API_KEY                       https://console.mistral.ai
//
// Two model tiers per provider: `fast` for the per-save enrichment call
// (high volume, easy task) and the default for user-facing chat answers.
// On Groq's free tier this matters a lot: llama-3.1-8b-instant allows
// 14,400 req/day vs 1,000 req/day for llama-3.3-70b-versatile.

const REQUEST_TIMEOUT_MS = 60_000;

type Provider = {
  name: string;
  baseUrl: string;
  apiKey: string | undefined;
  model: string;
  fastModel: string;
};

function configuredProviders(): Provider[] {
  const custom = process.env.AI_MODEL || '';
  const providers: Provider[] = [
    {
      name: 'custom',
      baseUrl: process.env.AI_BASE_URL || '',
      apiKey: process.env.AI_API_KEY,
      model: custom,
      fastModel: process.env.AI_FAST_MODEL || custom,
    },
    {
      name: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      fastModel: process.env.GROQ_FAST_MODEL || 'llama-3.1-8b-instant',
    },
    {
      name: 'cerebras',
      baseUrl: 'https://api.cerebras.ai/v1',
      apiKey: process.env.CEREBRAS_API_KEY,
      model: process.env.CEREBRAS_MODEL || 'gpt-oss-120b',
      fastModel: process.env.CEREBRAS_MODEL || 'gpt-oss-120b',
    },
    {
      name: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
      fastModel: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
    },
    {
      name: 'mistral',
      baseUrl: 'https://api.mistral.ai/v1',
      apiKey: process.env.MISTRAL_API_KEY,
      model: process.env.MISTRAL_MODEL || 'mistral-small-latest',
      fastModel: process.env.MISTRAL_MODEL || 'mistral-small-latest',
    },
  ];
  return providers.filter((p) => p.apiKey && p.baseUrl && p.model);
}

async function callProvider(
  provider: Provider,
  model: string,
  prompt: string,
  maxTokens?: number
): Promise<string> {
  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${provider.name} (${model}) returned ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error(`${provider.name} returned an empty completion`);
  }
  return text;
}

// Runs the prompt against the first configured provider, falling through to
// the next on any failure. Throws only if every configured provider fails
// (callers each have their own degradation path).
export async function chatComplete(
  prompt: string,
  opts: { fast?: boolean; maxTokens?: number } = {}
): Promise<string> {
  const providers = configuredProviders();
  if (providers.length === 0) {
    throw new Error(
      'No AI provider configured. Set GROQ_API_KEY (or CEREBRAS_API_KEY / OPENROUTER_API_KEY / MISTRAL_API_KEY / AI_API_KEY+AI_BASE_URL+AI_MODEL).'
    );
  }

  let lastError: unknown;
  for (const provider of providers) {
    try {
      return await callProvider(
        provider,
        opts.fast ? provider.fastModel : provider.model,
        prompt,
        opts.maxTokens
      );
    } catch (error) {
      lastError = error;
      console.warn('AI provider failed, trying next:', error);
    }
  }
  throw lastError;
}
