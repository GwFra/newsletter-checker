import Parser from 'rss-parser';
import { logger } from '../logger';

const parser = new Parser();

export interface FeedItem {
  title: string;
  url: string;
  publishedAt: Date | null;
  content: string;
}

export async function fetchFeed(feedUrl: string): Promise<FeedItem[]> {
  logger.info({ feedUrl }, 'Fetching RSS feed');
  const feed = await parser.parseURL(feedUrl);
  logger.info({ feedUrl, count: feed.items.length }, 'RSS feed fetched');

  return feed.items.map((item) => ({
    title: item.title ?? '(no title)',
    url: item.link ?? item.guid ?? '',
    publishedAt: item.pubDate ? new Date(item.pubDate) : null,
    content: item.contentSnippet ?? item.content ?? '',
  })).filter((item) => item.url !== '');
}
