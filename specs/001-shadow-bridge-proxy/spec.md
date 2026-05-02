# Feature Specification: ShadowBridge Proxy Aggregator

**Feature Branch**: `001-shadow-bridge-proxy`  
**Created**: May 3, 2026  
**Status**: Draft  
**Input**: User description: "# PROJECT SPECIFICATION: ShadowBridge (Proxy Aggregator for Legacy E-Readers) ..."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Book Search (Priority: P1)

As a user with a legacy E-Reader, I want to perform a single search that queries multiple digital libraries simultaneously so that I can find books efficiently without visiting multiple sites.

**Why this priority**: This is the core value proposition of the proxy aggregator. Without it, the system has no purpose.

**Independent Test**: Can be tested by calling the search API with a query and verifying that results from at least one provider are returned with valid metadata.

**Acceptance Scenarios**:

1. **Given** the proxy is running and at least one provider is configured, **When** a search query "The Great Gatsby" is sent, **Then** the response contains a list of books from available providers.
2. **Given** a book result is found, **When** the `downloadUrl` is inspected, **Then** it is a direct, wget-compatible link that starts a download without further interaction.

---

### User Story 2 - Provider Authentication Persistence (Priority: P2)

As a self-hoster, I want the system to manage my library sessions automatically so that I don't have to manually log in or handle cookies for every search.

**Why this priority**: Required for providers that mandate authentication (Z-Library, TVE-4U) to function reliably.

**Independent Test**: Can be tested by performing a search that requires login, then verifying that the session database contains valid tokens/cookies that are reused in subsequent requests.

**Acceptance Scenarios**:

1. **Given** no active session for Z-Library, **When** a search is performed, **Then** the system logs in using provided credentials and stores the session for future use.
2. **Given** an expired session, **When** a search is performed, **Then** the system detects the 401/expired state and automatically re-authenticates.

---

### User Story 3 - Fault-Tolerant Aggregation (Priority: P3)

As a user, I want the system to be resilient to individual library failures so that one library being down doesn't prevent me from seeing results from others.

**Why this priority**: Increases reliability in the face of unstable third-party repositories.

**Independent Test**: Can be tested by simulating a failure in one provider (e.g., Anna's Archive returning 403) and verifying that the overall search still returns results from other providers.

**Acceptance Scenarios**:

1. **Given** one provider is blocked or down, **When** a search is initiated, **Then** the API returns HTTP 200 with results from working providers and logs the failure for the broken one.

---

### Edge Cases

- **Search with no results**: System should return an empty results array and HTTP 200, not an error.
- **Malformed Provider HTML**: System should handle parsing failures gracefully using RegExp fallbacks or failing the specific provider without crashing the server.
- **Slow Providers**: System should have a timeout for each provider to prevent one slow library from hanging the entire request.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST concurrently query configured providers (Z-Library, Anna's Archive, TVE-4U, Madara).
- **FR-002**: System MUST normalize results from all providers into a standard schema (id, source, title, author, size, format, downloadUrl).
- **FR-003**: System MUST provide direct download links that do not require browser interaction or JS execution.
- **FR-004**: System MUST persist authentication states (cookies, tokens) in a local SQLite database.
- **FR-005**: System MUST extract IPFS CIDs from Anna's Archive and convert them to direct gateway URLs.
- **FR-006**: System MUST handle XenForo-style multi-phase login (token harvest followed by POST).
- **FR-007**: System MUST decode Base64 image/link arrays for Madara-based manga providers.

### Key Entities

- **BookResult**: Represents a single book or manga entry found in a library. Contains metadata and a direct link.
- **ProviderSession**: Represents the cached authentication state for a specific library provider.
- **SearchResponse**: The aggregated response sent back to the client, including results and any provider-specific errors.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Aggregated search results are returned to the client within 5 seconds under normal conditions.
- **SC-002**: 100% of returned `downloadUrl` links are compatible with basic HTTP clients like `wget` or `curl`.
- **SC-003**: System maintains 99% availability of the search endpoint even when 50% of providers are failing.

## Assumptions

- Users have valid credentials for private providers (e.g., Z-Library accounts).
- The host environment has network access to all library domains.
- The Kindle client can parse JSON responses from the proxy.
- Legacy E-Readers can handle the file formats returned (EPUB, PDF, CBZ, MOBI).
