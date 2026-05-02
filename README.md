# ShadowBridge Proxy Aggregator

ShadowBridge is a lightweight proxy aggregator for legacy e-readers. It exposes a simple HTTP API that queries multiple providers and returns normalized download results that work with `curl` and `wget`.

## Features

- Unified `/api/search` endpoint
- Concurrent provider aggregation with partial-failure handling
- Normalized result schema for books and manga
- Session persistence helper for authenticated providers
- Randomized User-Agent selection and request timeouts

## Requirements

- [Bun](https://bun.sh) 1.x
- Network access to configured providers
- Optional provider credentials for private sources

## Project Structure

- `src/index.ts` — API entry point
- `src/core/` — aggregation, session, and HTTP helpers
- `src/providers/` — provider adapters
- `src/types/` — shared TypeScript types
- `tests/` — automated tests

## Setup

1. Install dependencies:

   ```bash
   bun install
   ```

2. Create a `.env` file from the example below.

3. Start the service:

   ```bash
   bun src/index.ts
   ```

The server listens on `http://localhost:3000` by default.

## Environment Variables

Create a `.env` file with provider credentials when needed:

```env
ZLIB_EMAIL=your@email.com
ZLIB_PASSWORD=yourpassword
TVE4U_USERNAME=yourusername
TVE4U_PASSWORD=yourpassword
PORT=3000
```

## API Usage

### Search

```bash
curl "http://localhost:3000/api/search?q=The+Great+Gatsby"
```

Optional provider filter:

```bash
curl "http://localhost:3000/api/search?q=The+Great+Gatsby&providers=zlib,annas"
```

### Sessions

Inspect cached session records:

```bash
curl "http://localhost:3000/api/sessions"
```

## Response Shape

```json
{
  "query": "The Great Gatsby",
  "totalResults": 2,
  "results": [],
  "errors": []
}
```

## Kindle / KUAL Example

```bash
QUERY="The Great Gatsby"
DOWNLOAD_URL=$(curl -s "http://YOUR_PROXY_IP:3000/api/search?q=${QUERY// /+}" | jq -r '.results[0].downloadUrl')
wget "$DOWNLOAD_URL" -O "book.epub"
```

## Development

Run tests:

```bash
bun test
```

## Notes

- This implementation is intentionally lightweight and uses in-memory session storage for local development convenience.
- Provider adapters are stubs or demo implementations and should be wired to real endpoints before production use.
