# Research Findings: ShadowBridge Proxy Aggregator

This document consolidates research and technical decisions for the ShadowBridge providers.

## Z-Library EAPI Implementation

- **Decision**: Use the reverse-engineered Mobile EAPI for better stability and JSON responses.
- **Rationale**: Browser-based scraping of Z-Library is increasingly difficult due to Cloudflare and dynamic domains. The EAPI provides structured data.
- **Endpoints**:
  - Login: `POST /eapi/user/login` (application/x-www-form-urlencoded)
  - Search: `POST /eapi/book/search` (message, limit, etc.)
  - Download: `GET /eapi/book/{id}/{hash}/file`
- **Headers**:
  - `X-App-Version: 2.5.1`
  - `User-Agent: Mozilla/5.0 (Android 12; Mobile)`
- **Persistence**: Store `remix_userid` and `remix_userkey` in SQLite.

## Anna's Archive IPFS Extraction

- **Decision**: Extract IPFS CIDs directly from HTML using regular expressions.
- **Rationale**: Anna's Archive often uses Cloudflare. Fetching raw HTML and using Regex avoids complex DOM parsing that might trigger bot detection.
- **Regex**: `/href=["'](?:https?:\/\/[^\/]+\/ipfs\/)?(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58,})["']/g`
- **Gateway**: Transform CIDs into gateway URLs (e.g., `https://dweb.link/ipfs/{CID}`).

## TVE-4U (XenForo 2.x)

- **Decision**: Perform two-phase authentication to harvest CSRF tokens.
- **Rationale**: XenForo 2.x requires a valid `_xfToken` for state-changing requests like login.
- **Phase 1**: GET `/login/` to harvest `xf_session` and extract `_xfToken` via Regex: `name="_xfToken"\s+value="([^"]+)"`.
- **Phase 2**: POST `/login/login` with credentials and harvested token.
- **Persistence**: Store `xf_user` and `xf_session` cookies.

## Madara Theme (Manga)

- **Decision**: Extract Base64 encoded image arrays from chapter pages.
- **Rationale**: Madara themes often hide image links in a JavaScript array to prevent simple scraping.
- **Regex**: `/var\s+imageLinks\s*=\s*\[(.*?)\];/s`
- **Decoding**: Use Bun's native `Buffer.from(str, 'base64').toString()`.

## Bun Runtime Capabilities

- **Decision**: Utilize Bun's native APIs for performance and simplicity.
- **Rationale**: Bun provides high-performance `fetch`, `sqlite`, and `Buffer` implementations without external dependencies.
- **SQLite**: Use `bun:sqlite` for session management.
- **Network**: Use `fetch` with custom headers for TLS/UA spoofing.
- **Parsing**: Use native `RegExp` as the primary parser, with `cheerio` as a lightweight fallback for more complex DOM structures (like TVE-4U search results).
