import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import pinoHttp from "pino-http";
import { logger } from "./logger";
import { migrate } from "./db/migrate";
import {
  addFeed,
  listFeeds,
  listArticles,
  processFeed,
  processAllFeeds,
  getSummarizedArticle,
  getSummarizedArticles,
} from "./services/newsletter";
import { getPreferences, setPreferences } from "./services/preferences";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use(pinoHttp({ logger }));

app.get("/", (_req, res) => {
  res.json({ message: "Hello, world!" });
});

// Feeds
app.get("/feeds", async (_req, res, next) => {
  try {
    res.json(await listFeeds());
  } catch (err) {
    next(err);
  }
});

app.post(
  "/feeds",
  async (req: Request<{}, {}, { url: string; name?: string }>, res, next) => {
    try {
      const { url, name } = req.body;
      if (!url) return res.status(400).json({ error: "url is required" });
      res.status(201).json(await addFeed(url, name));
    } catch (err) {
      next(err);
    }
  },
);

// Trigger processing a feed
app.post("/feeds/:id/process", async (req, res, next) => {
  try {
    const feedId = parseInt(req.params.id, 10);
    if (isNaN(feedId))
      return res.status(400).json({ error: "invalid feed id" });
    res.json(await processFeed(feedId));
  } catch (err) {
    next(err);
  }
});

// Trigger processing all feeds
app.post("/feeds/process", async (req, res, next) => {
  try {
    res.json(await processAllFeeds());
  } catch (err) {
    next(err);
  }
});

// Articles
app.get("/articles", async (req, res, next) => {
  try {
    const feedId = req.query.feedId
      ? parseInt(req.query.feedId as string, 10)
      : undefined;
    res.json(await listArticles(feedId));
  } catch (err) {
    next(err);
  }
});

// Get summarized article by ID
app.get("/articles/summary/:id", async (req, res, next) => {
  try {
    const articleId = parseInt(req.params.id, 10);
    if (isNaN(articleId))
      return res.status(400).json({ error: "invalid article id" });
    const article = await getSummarizedArticle(articleId);
    if (!article) return res.status(404).json({ error: "article not found" });
    res.json(article);
  } catch (err) {
    next(err);
  }
});

// Get all summarized articles
app.get("/articles/summary", async (_req, res, next) => {
  try {
    const articles = await getSummarizedArticles();
    if (!articles) return res.status(404).json({ error: "no articles found" });
    const summarizedArticles = articles.map((article) => ({
      title: article.title,
      url: article.url,
      summary: article.summary,
    }));
    res.json(summarizedArticles);
  } catch (err) {
    next(err);
  }
});

// Preferences
app.get("/preferences", async (_req, res, next) => {
  try {
    const preferences = await getPreferences();
    res.json({ preferences });
  } catch (err) {
    next(err);
  }
});

app.post(
  "/preferences",
  async (req: Request<{}, {}, { preferences: string[] }>, res, next) => {
    try {
      const { preferences } = req.body;
      if (!Array.isArray(preferences)) {
        return res.status(400).json({ error: "preferences must be an array" });
      }
      await setPreferences(preferences);
      res.status(200).send();
    } catch (err) {
      next(err);
    }
  },
);

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: err.message });
});

async function start() {
  await migrate();
  app.listen(PORT, () => logger.info({ port: PORT }, "Server started"));
}

start().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
