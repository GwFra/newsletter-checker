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
} from "./services/newsletter";

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
