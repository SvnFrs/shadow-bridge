# ShadowBridge Agent Guide

This document is intended for automated agents, maintainers, and DevOps operators who need to understand, run, debug, deploy, or extend the ShadowBridge repository.

## 1. Project Summary

ShadowBridge is a Bun/TypeScript HTTP proxy aggregator for legacy e-reader clients such as Kindle/KUAL-based devices. It exposes a small JSON API that queries multiple provider adapters in parallel and returns normalized download metadata with direct, `curl`/`wget`-compatible URLs.

Primary goals:
- Provide a single search API for books and manga.
- Keep the service lightweight and self-hostable.
- Persist provider session state for authenticated sources.
- Be safe to run in a container and observable in production.

## 2. What the service does

The service currently:
- exposes `GET /` as a health banner
- exposes `GET /api/search?q=...`
- accepts an optional `providers=` filter
- queries configured providers concurrently
- normalizes provider results into a shared `BookResult` schema
- stores session tokens / cookies in SQLite via `bun:sqlite`
- performs startup link discovery for some mirrors
- logs requests, provider successes/failures, and timing information

## 3. Repository layout

Key files and folders:

- `src/index.ts` — Hono app, HTTP routes, startup behavior
- `src/core/aggregator.ts` — query fan-out and result aggregation
- `src/core/env.ts` — typed Bun environment access
- `src/core/httpClient.ts` — HTTP wrapper with headers and timeout support
- `src/core/linkDiscoverer.ts` — startup mirror discovery
- `src/core/logger.ts` — structured logging helpers
- `src/core/sessionDb.ts` — SQLite persistence layer
- `src/providers/` — provider adapters
- `src/types/` — shared TypeScript types
- `tests/` — Bun test suite, including e2e-style API coverage
- `Dockerfile` — container image definition
- `docker-compose.yml` — local container composition
- `kual/` — Kindle/KUAL launcher package scaffold

Specification docs live in:
- `specs/001-shadow-bridge-proxy/spec.md`
- `specs/001-shadow-bridge-proxy/plan.md`
- `specs/001-shadow-bridge-proxy/data-model.md`
- `specs/001-shadow-bridge-proxy/quickstart.md`
- `specs/001-shadow-bridge-proxy/contracts/search-api.md`

## 4. Runtime and build assumptions

- Runtime: Bun 1.x
- Language: TypeScript
- HTTP framework: Hono
- DB: SQLite via `bun:sqlite`
- Test runner: `bun test`

Bun-specific details:
- Use `Bun.env` instead of `process.env`.
- Prefer `atob` / Bun-native APIs where possible.
- `bun:sqlite` is provided by Bun at runtime.

## 5. Configuration

### Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | HTTP listen port | `3000` |
| `SEARCH_TIMEOUT_MS` | per-request search timeout | `5000` |
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` | `info` |
| `ZLIB_BASE_URL` | optional override for Z-Library base URL | none |
| `ZLIB_EMAIL` | Z-Library login email | none |
| `ZLIB_PASSWORD` | Z-Library login password | none |
| `ANNAS_BASE_URL` | optional Anna's Archive base URL override | none |
| `TVE4U_USERNAME` | TVE-4U login username | none |
| `TVE4U_PASSWORD` | TVE-4U login password | none |

### Session database

The repo currently creates a `sessions.sqlite` file in the workspace root unless overridden by code or the container runtime. The DB stores provider tokens and base URLs under a simple `(provider, key)` primary key.

For container deployment, mount a persistent volume for the SQLite file or update the code to place it under `/app/data`.

## 6. Provider behavior

### `zlib`
- Uses authenticated EAPI login flow.
- Persists `remix_userid` and `remix_userkey`.
- Automatically retries login when session state is missing.
- Returns direct download URLs built from the book metadata.

### `annas`
- Searches Anna's Archive mirror pages and extracts IPFS CIDs from raw HTML.
- Converts CID entries into direct gateway URLs.
- Uses configured mirror list plus discovered base URLs.
- No explicit account login is implemented.

### `tve4u`
- Uses XenForo-style login flow.
- Harvests CSRF token from login page.
- Persists `xf_session` and `xf_user` cookies.
- Parses search results with Cheerio.
- Requires credentials when sessions are absent.

### `madara`
- Parses chapter pages that contain Base64-encoded image/link arrays.
- Can also fall back to direct image extraction.
- Uses native decoding and stable IDs.
- No login flow is implemented.

## 7. Logging and observability

The app now emits structured logs for:
- request start/completion
- request failures
- provider completion/failure
- background discovery warnings
- provider mirror updates

Important notes for operators:
- Set `LOG_LEVEL=info` or `warn` in production.
- Logs include request IDs, path, status, and duration fields where relevant.
- There is no external telemetry integration yet.

## 8. Fail-safe behavior

Implemented safeguards:
- per-search timeout through `SEARCH_TIMEOUT_MS`
- `Promise.allSettled` aggregation so one provider does not fail the entire request
- error normalization through shared error helpers
- provider-level fallback behavior in some adapters

Operational behavior:
- Missing query returns HTTP 400.
- Unknown provider filter returns HTTP 400.
- Provider failures are returned in the `errors` array, while successful results still return HTTP 200.
- Unexpected failures are mapped to HTTP 500.

## 9. API reference

### `GET /`
Returns a plain-text service banner.

### `GET /api/search`

Query parameters:
- `q` — required search term
- `providers` — optional comma-separated allowlist

Success response shape:

```json
{
  "query": "The Great Gatsby",
  "totalResults": 2,
  "results": [],
  "errors": []
}
```

Partial failures still return HTTP 200 and include provider error strings.

## 10. Development workflow

Install dependencies:

```bash
bun install
```

Run the service:

```bash
bun src/index.ts
```

Run tests:

```bash
bun test
```

Run the e2e-focused test file only:

```bash
bun test tests/api.e2e.test.ts
```

## 11. Container workflow

The repo includes:
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`

Current container expectations:
- expose port `3000`
- provide `PORT`, `LOG_LEVEL`, `SEARCH_TIMEOUT_MS`
- mount persistent storage for SQLite if provider sessions matter across restarts

Recommended production hardening:
- run behind a reverse proxy
- add container healthchecks
- place session DB on durable storage
- pass secrets through environment variables or secret stores, not committed files

## 11.1 Kindle/KUAL workflow

The `kual/` directory contains the Kindle-side launcher scaffold derived from the old `KindleFetch` layout.

Current contents:
- `kual/kindlefetch/menu.json` — KUAL menu metadata
- `kual/kindlefetch/run.sh` — launcher entry point
- `kual/kindlefetch/bin/shadowbridge.sh` — Kindle-side search script

The script currently:
- prompts for a query
- calls the ShadowBridge `/api/search` endpoint
- prints search results in a Kindle/kterm-friendly format

Recommended next step:
- extend the script so the user can choose a result and download it directly to the Kindle document directory.

## 12. Testing guidance

Existing tests cover:
- aggregator behavior
- API-level e2e-style behavior using the app directly
- successful and error paths
- search-to-download integration behavior
- provider fallback and parser behavior

When adding new providers or router behavior, prefer:
- unit tests for parsers and helper functions
- route tests that validate JSON contract
- provider integration tests with mocked network responses

### Integration test flow

`tests/integration.e2e.test.ts` exercises the full client path:
1. call the API search endpoint
2. select a returned `downloadUrl`
3. fetch the file directly
4. verify response metadata and byte count

This test does not require a live external provider; it uses mocked network responses to validate the end-to-end orchestration and download handling.

### Provider integration checks

`tests/providers.integration.test.ts` validates:
- Anna's Archive MD5 fallback parsing
- Z-Library alternate response-shape handling
- TVE-4U session failure behavior

Use this file when changes affect provider parsing or login/session recovery.

## 13. Notes for future agents

- Do not reintroduce `process.env`; use `Bun.env` via `src/core/env.ts`.
- Keep provider-specific auth logic inside provider helpers, not in the router.
- Avoid placeholder implementations in provider adapters.
- Preserve the normalized response schema in `src/types/index.ts`.
- Prefer structured logs over `console.log`.
- If you add more persistent state, document the schema in `specs/001-shadow-bridge-proxy/data-model.md` and update the agent guide.

## 14. Known gaps / next steps

- Session DB path is still root-local unless the runtime is configured otherwise.
- No `/health` or `/ready` endpoint yet.
- Container healthcheck can still be added.
- The repo does not yet have a formal release process.
- Some provider logic may still depend on external site structure changes.

## 15. Maintainer checklist

Before release:
- `bun test` passes
- container image builds successfully
- secrets are not committed
- persistent storage is configured for SQLite
- log level is appropriate for production
- provider credentials are present only where needed

## 16. DevOps checklist

- Build the image from the repo root.
- Run the container with a mounted volume for session state.
- Expose port `3000` or configure `PORT` accordingly.
- Rotate provider credentials when changed.
- Monitor logs for provider-specific failures and discovery warnings.
- Add reverse-proxy auth if the service is exposed beyond a trusted network.
