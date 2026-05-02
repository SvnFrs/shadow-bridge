# ShadowBridge Proxy Aggregator

ShadowBridge is a Bun/TypeScript service that aggregates search results from multiple library and forum providers, then returns normalized metadata and direct download URLs for legacy clients such as Kindle/KUAL workflows.

## What it provides

- `GET /api/search` for unified provider search
- concurrent aggregation with partial-failure tolerance
- normalized `BookResult` output for books and manga
- SQLite-backed session storage for authenticated providers
- structured logging with request IDs and timing data
- container-friendly runtime defaults

## Runtime overview

- **Runtime**: Bun 1.x
- **Framework**: Hono
- **Language**: TypeScript
- **Persistence**: SQLite via `bun:sqlite`
- **Testing**: `bun test`

## Repository layout

- `src/index.ts` — HTTP entrypoint and route definitions
- `src/core/` — environment, aggregation, logging, session, and HTTP helpers
- `src/providers/` — provider adapters
- `src/types/` — shared TypeScript interfaces
- `tests/` — unit and e2e-style tests
- `Dockerfile` — container image definition
- `docker-compose.yml` — local container composition
- `docs/AGENT_GUIDE.md` — maintainer and agent reference
- `kual/` — Kindle/KUAL launcher scaffold

## Quick start

1. Install dependencies:

   ```bash
   bun install
   ```

2. Configure environment variables as needed.

3. Start the service:

   ```bash
   bun src/index.ts
   ```

The server listens on `http://localhost:3000` by default.

## Configuration

Create a `.env` file when private providers are used:

```env
PORT=3000
SEARCH_TIMEOUT_MS=5000
LOG_LEVEL=info

ZLIB_BASE_URL=https://z-library.im
ZLIB_EMAIL=your@email.com
ZLIB_PASSWORD=yourpassword

ANNAS_BASE_URL=https://annas-archive.li

TVE4U_USERNAME=yourusername
TVE4U_PASSWORD=yourpassword
```

Notes:
- `ANNAS_BASE_URL` is optional.
- `ZLIB_BASE_URL` and `TVE4U` credentials are used only when those providers are enabled.

## API

### Search

```bash
curl "http://localhost:3000/api/search?q=The+Great+Gatsby"
```

Optional provider filter:

```bash
curl "http://localhost:3000/api/search?q=The+Great+Gatsby&providers=zlib,annas"
```

### Response shape

```json
{
  "query": "The Great Gatsby",
  "totalResults": 2,
  "results": [],
  "errors": []
}
```

Partial failures still return `200 OK` with successful results and provider error messages in `errors`.

## Container usage

Build and run with Docker:

```bash
docker compose up --build
```

Recommended runtime settings:
- mount durable storage for `sessions.sqlite`
- set `LOG_LEVEL=info` or `warn`
- set `SEARCH_TIMEOUT_MS` conservatively for your network
- keep provider credentials in environment variables or secret storage

## Testing

Run all tests:

```bash
bun test
```

Run the API e2e-focused file:

```bash
bun test tests/api.e2e.test.ts
```

Run the integration flow that searches, selects a result, and downloads the file:

```bash
bun test tests/integration.e2e.test.ts
```

Run provider-focused integration tests:

```bash
bun test tests/providers.integration.test.ts
```

The integration flow validates the full path from `/api/search` to file download handling.

## Kindle / KUAL example

```bash
QUERY="The Great Gatsby"
DOWNLOAD_URL=$(curl -s "http://YOUR_PROXY_IP:3000/api/search?q=${QUERY// /+}" | jq -r '.results[0].downloadUrl')
wget "$DOWNLOAD_URL" -O "book.epub"
```

### Kindle package scaffold

The `kual/` directory contains a Kindle-side launcher package based on the older `KindleFetch` structure. It is intended to be copied into the Kindle `extensions` directory and wired to a backend URL through `SHADOWBRIDGE_URL`.

## Maintenance notes

- Keep `src/core/env.ts` as the single source of truth for environment access.
- Avoid reintroducing `process.env` in provider or core code.
- Keep provider auth logic inside provider modules.
- Preserve the normalized response schema in `src/types/index.ts`.
- Update `docs/AGENT_GUIDE.md` when runtime, deployment, or provider assumptions change.
