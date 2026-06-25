import { pool } from "../db/client";
import { logger } from "../logger";
import { getPreferences } from "./preferences";
import { fetchFeed } from "./rss";
import { summarize } from "./summarizer";

export interface Feed {
  id: number;
  url: string;
  name: string | null;
  created_at: Date;
}

export interface Article {
  id: number;
  feed_id: number;
  title: string;
  url: string;
  published_at: Date | null;
  summary: string | null;
  created_at: Date;
}

export async function addFeed(url: string, name?: string): Promise<Feed> {
  logger.info({ url, name }, "Adding feed");
  const { rows } = await pool.query<Feed>(
    "INSERT INTO feeds (url, name) VALUES ($1, $2) ON CONFLICT (url) DO UPDATE SET name = EXCLUDED.name RETURNING *",
    [url, name ?? null],
  );
  logger.info({ feedId: rows[0].id, url }, "Feed added");
  return rows[0];
}

export async function listFeeds(): Promise<Feed[]> {
  logger.info("Listing feeds");
  const { rows } = await pool.query<Feed>(
    "SELECT * FROM feeds ORDER BY created_at DESC",
  );
  return rows;
}

export async function listArticles(feedId?: number): Promise<Article[]> {
  logger.info({ feedId }, "Listing articles");
  if (feedId !== undefined) {
    const { rows } = await pool.query<Article>(
      "SELECT * FROM articles WHERE feed_id = $1 ORDER BY published_at DESC",
      [feedId],
    );
    return rows;
  }
  const { rows } = await pool.query<Article>(
    "SELECT * FROM articles ORDER BY published_at DESC",
  );
  return rows;
}

export async function getSummarizedArticle(
  articleId: number,
): Promise<Article | null> {
  logger.info({ articleId }, "Fetching summarized article");
  const { rows } = await pool.query<Article>(
    "SELECT * FROM articles WHERE id = $1",
    [articleId],
  );
  return rows[0] ?? null;
}

export async function getSummarizedArticles(): Promise<Article[] | null> {
  logger.info("Fetching all summarized articles");
  const { rows } = await pool.query<Article>("SELECT * FROM articles");
  return rows ?? null;
}

export async function processFeed(
  feedId: number,
): Promise<{ added: number; skipped: number }> {
  const { rows } = await pool.query<Feed>("SELECT * FROM feeds WHERE id = $1", [
    feedId,
  ]);

  const preferences = await getPreferences();

  const feed = rows[0];
  if (!feed) throw new Error(`Feed ${feedId} not found`);

  logger.info({ feedId, url: feed.url }, "Processing feed");

  const items = await fetchFeed(feed.url);
  let added = 0;
  let skipped = 0;

  for (const item of items) {
    const exists = await pool.query("SELECT 1 FROM articles WHERE url = $1", [
      item.url,
    ]);
    if (exists.rowCount && exists.rowCount > 0) {
      logger.debug({ url: item.url }, "Article already exists, skipping");
      skipped++;
      continue;
    }

    logger.info({ title: item.title }, "Summarising article");
    const summary = await summarize(item.title, item.content, preferences);

    await pool.query(
      `INSERT INTO articles (feed_id, title, url, published_at, content, summary)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [feedId, item.title, item.url, item.publishedAt, item.content, summary],
    );
    logger.info({ title: item.title }, "Article stored");
    added++;
  }

  logger.info({ feedId, added, skipped }, "Feed processing complete");
  return { added, skipped };
}

export async function processAllFeeds(): Promise<
  { feedId: number; added: number; skipped: number }[]
> {
  const feeds = await listFeeds();
  const results: { feedId: number; added: number; skipped: number }[] = [];

  for (const feed of feeds) {
    // Slow as it makes two DB queries to find the feed and then process it, but it's simple and works for now.
    const result = await processFeed(feed.id);
    results.push({ feedId: feed.id, ...result });
  }

  logger.info(
    {
      results: `Processed ${results.length} feeds: ${results.map((r) => `Feed ${r.feedId}: ${r.added} added, ${r.skipped} skipped`).join(", ")}`,
    },
    "All feeds processed",
  );
  return results;
}
