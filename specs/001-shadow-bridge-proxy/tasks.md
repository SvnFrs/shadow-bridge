# Tasks: ShadowBridge Proxy Aggregator

**Input**: Design documents from `/specs/001-shadow-bridge-proxy/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/
**Tests**: Tests are NOT explicitly requested in the specification, so they are omitted to maintain focus on implementation speed and simplicity as per Bun's lean philosophy.
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project structure: `src/core`, `src/providers`, `src/types`, `tests/`
- [X] T002 Initialize Bun project and install `hono` and `cheerio`
- [X] T003 [P] Configure `.env.example` with provider credential placeholders

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented
**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Define global interfaces (BookResult, SearchResponse, FileType) in `src/types/index.ts`
- [X] T005 Implement SQLite session manager with `bun:sqlite` in `src/core/sessionDb.ts`
- [X] T006 Implement `httpClient.ts` fetch wrapper with UA/TLS spoofing in `src/core/httpClient.ts`
- [X] T007 Setup Hono API router skeleton with basic logging in `src/index.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Unified Book Search (Priority: P1) 🎯 MVP

**Goal**: Query multiple libraries (unauthenticated) and return normalized results.
**Independent Test**: Call `GET /api/search?q=query` and receive JSON results from Anna's Archive and Madara providers.

### Implementation for User Story 1

- [X] T008 [P] [US1] Implement Anna's Archive IPFS extraction (Regex) in `src/providers/annas.ts`
- [X] T009 [P] [US1] Implement Madara Manga decoder (Regex/Base64) in `src/providers/madara.ts`
- [X] T010 [US1] Implement aggregator orchestration logic in `src/core/aggregator.ts`
- [X] T011 [US1] Implement `GET /api/search` endpoint in `src/index.ts`
- [X] T012 [US1] Normalize results from Anna's and Madara into `BookResult` schema

**Checkpoint**: User Story 1 is functional as an MVP with two providers.

---

## Phase 4: User Story 2 - Provider Authentication Persistence (Priority: P2)

**Goal**: Support authenticated providers (Z-Library, TVE-4U) with persistent sessions.
**Independent Test**: Perform a search that triggers Z-Library login, verify `remix_userkey` is saved in `sessions.sqlite`, and reuse it for next search.

### Implementation for User Story 2

- [X] T013 [P] [US2] Implement Z-Library EAPI provider with login logic in `src/providers/zlib.ts`
- [X] T014 [P] [US2] Implement TVE-4U XenForo provider with CSRF harvesting in `src/providers/tve4u.ts`
- [X] T015 [US2] Integrate `sessionDb` for token persistence in `src/providers/zlib.ts`
- [X] T016 [US2] Integrate `sessionDb` for cookie persistence in `src/providers/tve4u.ts`
- [X] T017 [US2] Update aggregator to include Zlib and TVE-4U providers in `src/core/aggregator.ts`

**Checkpoint**: Authenticated providers are now supported with automatic session management.

---

## Phase 5: User Story 3 - Fault-Tolerant Aggregation (Priority: P3)

**Goal**: Ensure individual provider failures do not crash the search request.

**Independent Test**: Block one provider (e.g., set invalid domain for Zlib) and verify search still returns results from Anna's Archive with an error entry.

### Implementation for User Story 3

- [X] T018 [US3] Implement `Promise.allSettled` for concurrent provider execution in `src/core/aggregator.ts`
- [X] T019 [US3] Add try-catch blocks and error normalization to all providers in `src/providers/`
- [X] T020 [US3] Update `SearchResponse` to include provider errors in `src/index.ts`

**Checkpoint**: All user stories are independently functional and resilient.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T021 [P] Implement request timeouts in `src/core/httpClient.ts`
- [X] T022 [P] Add randomized User-Agents for bot evasion in `src/core/httpClient.ts`
- [X] Run `quickstart.md` validation scenarios to confirm end-to-end flow

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase.
- **Polish (Final Phase)**: Depends on all user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Independent after Phase 2.
- **User Story 2 (P2)**: Independent after Phase 2, but benefits from US1's aggregator logic.
- **User Story 3 (P3)**: Depends on US1/US2 to have enough complexity to fail gracefully.

### Parallel Opportunities

- T003 (Setup)
- T008, T009 (US1 Providers)
- T013, T014 (US2 Providers)
- T021, T022 (Polish)

---

## Parallel Example: User Story 1

```bash
# Implement providers in parallel:
Task: "Implement Anna's Archive IPFS extraction in src/providers/annas.ts"
Task: "Implement Madara Manga decoder in src/providers/madara.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup + Foundational.
2. Complete User Story 1 (Anna's + Madara + Aggregator).
3. **VALIDATE**: Search returns IPFS links and Manga pages.

### Incremental Delivery

1. Foundation ready.
2. Add US1 → MVP search works.
3. Add US2 → Zlib and TVE-4U added with login support.
4. Add US3 → Resiliency added.
5. Final Polish.

