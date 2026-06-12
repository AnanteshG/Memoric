# Memoric - AI-Powered Second Brain

Memoric is an AI-powered personal knowledge base. Pin links, notes and posts to your board; everything gets summarized, tagged and embedded automatically so you can search it and chat with it later.

## ✨ Features

- 📌 **Content buckets**: X posts, Reddit posts (with top comments), YouTube videos (with transcripts), GitHub repos (with README), articles/websites, notes and images
- 🧠 **AI-powered chat (RAG)**: ask questions about everything you've saved; answers cite their sources
- 🏷️ **Auto-enrichment**: every saved item gets an AI summary, tags and insights in the background
- 🔍 **Smart search**: semantic (vector) search with keyword fallback
- 🔐 **Auth + storage**: Supabase (Postgres + pgvector + RLS)
- 💸 **Free AI stack**: embeddings run locally (no API, no rate limits); chat/enrichment use free OpenAI-compatible providers with automatic failover

## 🛠️ Tech Stack

- **Next.js 15** (App Router, Turbopack) + **React 19** + **TypeScript 5**
- **Tailwind CSS 4**, Framer Motion, Lucide icons
- **Supabase** — auth, Postgres, pgvector (768-dim HNSW index), RLS
- **transformers.js** (`@huggingface/transformers`) — local embeddings with `nomic-embed-text-v1.5` (downloads ~135MB once, then cached; no API key)
- **Free LLM providers** (OpenAI-compatible, tried in order until one succeeds):
  - [Groq](https://console.groq.com) — recommended; no card needed. Chat uses `llama-3.3-70b-versatile` (1K req/day), enrichment uses `llama-3.1-8b-instant` (14.4K req/day)
  - [Cerebras](https://cloud.cerebras.ai) — `gpt-oss-120b`, 1M tokens/day but 5 req/min; good overflow behind Groq
  - [OpenRouter](https://openrouter.ai) — `:free` models, 50 req/day (1,000/day after a one-time $10 credit purchase)
  - [Mistral](https://console.mistral.ai) — experiment tier; phone verification, may train on data

Configure any one key and the app works; configure several and the app falls through on rate limits — useful when multiple people share a deployment.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is fine)
- At least one free LLM API key (Groq is the easiest: sign up, create a key, no card required)

### Installation

1. **Clone and install:**

```bash
git clone https://github.com/your-username/memoric.git
cd memoric
npm install
```

2. **Set up environment variables** — copy `.env.example` to `.env.local` and fill it in:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI chat/enrichment — set at least one (Groq recommended)
GROQ_API_KEY=your_groq_key
# CEREBRAS_API_KEY=
# OPENROUTER_API_KEY=
# MISTRAL_API_KEY=
# Or any other OpenAI-compatible endpoint:
# AI_BASE_URL=  AI_API_KEY=  AI_MODEL=

# Reddit official API (free, 100 req/min) — register a "script" app at
# reddit.com/prefs/apps. Reddit blocks keyless access on many networks.
REDDIT_CLIENT_ID=your_reddit_app_id
REDDIT_CLIENT_SECRET=your_reddit_app_secret

# Optional: richer YouTube metadata (views/likes); transcripts work without it
# YOUTUBE_API_KEY=
```

Embeddings need no key — they run locally in the Node process.

3. **Apply database migrations** (Supabase SQL editor or CLI) from `supabase/migrations/` in order.

4. **Run the dev server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 📦 How content buckets work

Paste any link in the upload modal — the type is detected from the URL on the server:

| Bucket  | Source of content (what gets embedded for RAG) |
| ------- | ---------------------------------------------- |
| X post  | Tweet text + author (FxTwitter/VxTwitter public APIs, no key) |
| Reddit  | Post body + top comments with free app credentials; **falls back to the post title/blurb/image via OpenGraph when no credentials are set**, so it works keyless. Share links and redd.it resolved |
| YouTube | Title + description + full transcript (watch-page captions, no key) |
| GitHub  | Repo description + README excerpt (public REST API) |
| Website | OpenGraph metadata + page text |
| Note    | Your text, as written |
| Image   | Your description |

Saving returns instantly; AI summary, tags, insights and the embedding are filled in by a background job. The chat route backfills any embeddings that didn't make it.

## 🧪 Available Scripts

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## 🚢 Deployment

Works on any Node host (Vercel, Railway, a VPS with the included Dockerfile). Notes:

- Set all environment variables from `.env.local`.
- The embedding model downloads on first use to the Hugging Face cache; set `HF_HOME` to a writable, persistent path in containers.
- On serverless platforms cold starts pay the model load; a long-running Node server (Docker/Railway/VPS) is the better fit for the local embedder.

## 📄 License

MIT — see [LICENSE](LICENSE).
