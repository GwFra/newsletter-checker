# Newsletter Checker

A Node.js service that fetches RSS feeds, summarises articles with OpenAI, and stores them in a Neon (PostgreSQL) database.

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and OPENAI_API_KEY
npm run dev
```

## API

| Method | Path                 | Description                                         |
| ------ | -------------------- | --------------------------------------------------- |
| `GET`  | `/feeds`             | List all feeds                                      |
| `POST` | `/feeds`             | Add a feed `{ url, name? }`                         |
| `POST` | `/feeds/:id/process` | Fetch, summarise, and store new articles for a feed |
| `POST` | `/feeds/process`     | Process all feeds                                   |
| `GET`  | `/articles`          | List all articles                                   |
| `GET`  | `/articles?feedId=`  | List articles for a specific feed                   |

A Postman collection is available at `postman_collection.json`.

## TODO

- Create an email sender for the summary - might be worth including links
- Add list of key sections that are required/are of note for the users
- Figure out if OpenApi is what needs to be used
- Exampe CRON job
- Add testing somewhere
- Create frontend with login
- Optimise SQL queries and API calls
