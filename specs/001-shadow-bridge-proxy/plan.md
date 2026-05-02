# Implementation Plan: ShadowBridge Proxy Aggregator

**Branch**: `001-shadow-bridge-proxy` | **Date**: May 3, 2026 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-shadow-bridge-proxy/spec.md`

## Summary

ShadowBridge is a lightweight proxy aggregator for legacy E-Readers, designed to search multiple shadow libraries concurrently and provide direct, wget-compatible download links. It uses Bun, TypeScript, and Hono.js to deliver a high-performance, self-hosted backend.

## Technical Context

**Language/Version**: TypeScript / Bun 1.x  
**Primary Dependencies**: Hono.js, `bun:sqlite`, `cheerio`  
**Storage**: SQLite (`bun:sqlite`) for session and cookie persistence  
**Testing**: Bun's native test runner (`bun test`)  
**Target Platform**: Self-hosted (Linux/Docker), Client: Kindle Paperwhite 4 (KUAL script)
**Project Type**: Web Service / Proxy Aggregator  
**Performance Goals**: Aggregated results within 5 seconds; 100% direct download compatibility  
**Constraints**: No headless browsers; Native `RegExp` for parsing; TLS spoofing/retries  
**Scale/Scope**: 4 Initial Providers (Z-Library, Anna's Archive, TVE-4U, Madara)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Library-First**: Core logic (aggregator, providers) will be separated from the Hono router.
- [x] **Test-First**: Providers and aggregator will have unit/integration tests before final implementation.
- [x] **Simplicity**: No heavy dependencies; relying on Bun's native APIs and standard library.

## Project Structure

### Documentation (this feature)

```text
specs/001-shadow-bridge-proxy/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (generated separately)
```

### Source Code (repository root)

```text
/src
├── index.ts # Hono API Router & Entry point
├── /core
│ ├── aggregator.ts # Orchestrates Promise.allSettled across providers
│ ├── sessionDb.ts # SQLite wrapper for cookie/token persistence
│ └── httpClient.ts # Custom fetch wrapper handling TLS spoofing & retries
├── /providers
│ ├── zlib.ts # Z-Library EAPI implementation
│ ├── annas.ts # Anna's Archive IPFS extraction
│ ├── tve4u.ts # XenForo CSRF stateful extraction
│ └── madara.ts # Manga Base64 array decoder
└── /types
└── index.ts # Global Type Interfaces

/tests
├── core/
├── providers/
└── integration/
```

**Structure Decision**: Single project layout following the Facade pattern. Providers are isolated modules under `/providers`. Core logic resides in `/core`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | | |
