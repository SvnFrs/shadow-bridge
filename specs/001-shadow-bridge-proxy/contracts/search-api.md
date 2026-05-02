# API Contract: Search API

## Search Endpoint

Queries aggregated providers for books or manga.

- **URL**: `/api/search`
- **Method**: `GET`
- **Authentication**: None (Self-hosted proxy, usually behind local network or auth proxy)

### Query Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `q` | string | Yes | The search query (title, author, etc.) |
| `providers` | string | No | Comma-separated list of providers to query (e.g., `zlib,annas`). Defaults to all. |

### Success Response

- **Code**: 200 OK
- **Content**:

```json
{
  "query": "The Great Gatsby",
  "totalResults": 2,
  "results": [
    {
      "id": "123456",
      "source": "zlib",
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald",
      "sizeMb": 0.5,
      "format": "epub",
      "downloadUrl": "https://z-lib.sk/eapi/book/123456/a1b2c3d4/file"
    },
    {
      "id": "Qm...",
      "source": "annas",
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald",
      "sizeMb": 1.2,
      "format": "pdf",
      "downloadUrl": "https://dweb.link/ipfs/Qm..."
    }
  ],
  "errors": []
}
```

### Partial Failure Response

If one provider fails but others succeed, the API still returns 200 OK with results from working providers.

- **Code**: 200 OK
- **Content**:

```json
{
  "query": "The Great Gatsby",
  "totalResults": 1,
  "results": [...],
  "errors": ["annas: HTTP 403 Forbidden (Cloudflare)"]
}
```

### Error Responses

- **Code**: 400 Bad Request
- **Content**: `{ "error": "Query parameter 'q' is required" }`
