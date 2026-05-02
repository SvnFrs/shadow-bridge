# Data Model: ShadowBridge Proxy Aggregator

## Persistence (SQLite)

The system uses a flat table structure for session and cookie persistence.

### Table: `sessions`

| Column | Type | Description |
| :--- | :--- | :--- |
| `provider` | TEXT | The provider identifier (e.g., `zlib`, `tve4u`) |
| `key` | TEXT | The name of the token or cookie (e.g., `remix_userkey`, `xf_user`) |
| `value` | TEXT | The actual value or cookie string |
| `updated_at` | DATETIME | Automatic timestamp for last update |

**Primary Key**: `(provider, key)`

---

## Domain Entities (TypeScript)

### `BookResult`

Represents a normalized search result from any provider.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | Unique identifier within the source |
| `source` | string | Source provider name (`zlib`, `annas`, `tve4u`, `madara`) |
| `title` | string | Title of the book or manga |
| `author` | string | Author or artist name |
| `sizeMb` | number | File size in Megabytes |
| `format` | string | File extension (`epub`, `pdf`, `mobi`, `cbz`, `unknown`) |
| `downloadUrl` | string | Direct, wget-compatible download link |

### `SearchResponse`

The final response returned to the client.

| Field | Type | Description |
| :--- | :--- | :--- |
| `query` | string | The original search query |
| `totalResults` | number | Sum of all results from all providers |
| `results` | BookResult[] | Array of aggregated results |
| `errors` | string[] | Optional list of provider failures |
