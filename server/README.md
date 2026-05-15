# sync-api

Fastify + PostgreSQL + Drizzle. Single-user v1.

## Setup

```bash
# 1. Start postgres (uses the docker-compose.yml at the repo root)
docker compose up -d

# 2. Install deps
cd server
pnpm install

# 3. Configure env
cp .env.example .env

# 4. Push the schema to postgres (creates tables)
pnpm db:push

# 5. Run
pnpm dev
```

Server listens on `http://localhost:3000`.

## Routes

| Method | Path | Notes |
|---|---|---|
| `GET`    | `/healthz` | Liveness |
| `GET`    | `/threads` | List threads, each with `thoughtCount`, most-recent-first |
| `GET`    | `/threads/:id` | Thread + ordered thoughts |
| `POST`   | `/threads` | `{ content }` — create thread with first thought |
| `POST`   | `/threads/:id/thoughts` | `{ content }` — append thought |
| `PATCH`  | `/threads/:id/thoughts/:thoughtId` | `{ content }` — edit a thought's body |
| `DELETE` | `/threads/:id` | Delete thread (cascades to thoughts + connections) |
| `GET`    | `/export` | Full canonical JSON dump |
| `GET`    | `/export.md` | Same dump as readable Markdown |
| `GET`    | `/export/threads/:id` | One thread + its incident connections |

## Export format

```json
{
  "format": "sync-export",
  "version": 1,
  "exportedAt": "2026-05-16T...Z",
  "counts": { "threads": 12, "thoughts": 47, "connections": 8 },
  "threads": [
    {
      "id": "uuid",
      "createdAt": "...",
      "updatedAt": "...",
      "thoughts": [
        { "id": "uuid", "ordinal": 0, "content": "...", "createdAt": "..." }
      ]
    }
  ],
  "connections": [
    {
      "fromThreadId": "uuid", "fromThoughtId": "uuid",
      "toThreadId":   "uuid", "toThoughtId":   "uuid",
      "similarity": 0.812, "keywords": ["...", "..."]
    }
  ]
}
```

The within-thread chain is the `thoughts` array, ordered by `ordinal`.
The cross-thread chain is the `connections` array (denormalized so a consumer
never has to re-join).

## Scripts

| Script | Notes |
|---|---|
| `pnpm dev` | Watch-mode dev server |
| `pnpm build` | tsc compile to `dist/` |
| `pnpm start` | Run compiled `dist/index.js` |
| `pnpm typecheck` | tsc --noEmit |
| `pnpm db:push` | Sync schema to DB (dev) |
| `pnpm db:generate` | Generate a migration from schema diff |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Drizzle web UI for the DB |

## Notes

- `connections` is precomputed by an embedding pipeline (not in v1). The table
  is created and the export carries it, but it'll be empty until that lands.
- No auth in v1. Bind to `127.0.0.1` if you don't want it reachable on LAN.
