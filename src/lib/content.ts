// Maps a Postgres `content` row (snake_case) to the camelCase shape the
// frontend already consumes, so the API response contract is unchanged.

export interface ContentRow {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  content: string | null;
  processed_content: string | null;
  summary: string | null;
  tags: string[] | null;
  original_link: string | null;
  url: string | null;
  author: string | null;
  platform: string | null;
  thumbnail: string | null;
  metadata: Record<string, unknown> | null;
  external_data: Record<string, unknown> | null;
  metrics: Record<string, unknown> | null;
  created_at: string;
}

export function rowToContent(row: ContentRow) {
  const metadata = row.metadata ?? {};
  return {
    id: row.id,
    contentId: row.id, // back-compat: old API exposed a separate contentId
    type: row.type,
    title: row.title ?? '',
    content: row.content ?? '',
    processedContent: row.processed_content ?? '',
    summary: row.summary ?? '',
    tags: row.tags ?? [],
    originalLink: row.original_link ?? '',
    url: row.url ?? '',
    author: row.author ?? null,
    platform: row.platform ?? null,
    thumbnail: row.thumbnail ?? null,
    metadata,
    externalData: row.external_data ?? null,
    metrics: row.metrics ?? {},
    tweetData: (metadata as Record<string, unknown>).tweetData ?? undefined,
    createdAt: row.created_at,
    timestamp: row.created_at,
  };
}
