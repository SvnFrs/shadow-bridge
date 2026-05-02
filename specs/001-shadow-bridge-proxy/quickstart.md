# Quickstart: ShadowBridge Proxy Aggregator

## Prerequisites

- [Bun](https://bun.sh) installed (v1.x)
- Environment variables configured for private providers (see `.env.example`)

## Installation

```bash
bun install
```

## Running the Server

```bash
bun src/index.ts
```

The server will start on `http://localhost:3000` by default.

## Configuration (.env)

```env
ZLIB_EMAIL=your@email.com
ZLIB_PASSWORD=yourpassword
TVE4U_USERNAME=yourusername
TVE4U_PASSWORD=yourpassword
```

## Example Usage (CLI)

```bash
curl "http://localhost:3000/api/search?q=The+Great+Gatsby"
```

## Kindle Client Integration

On your Kindle (via KUAL/bash), you can use `wget` to fetch and download:

```bash
# Search and get first result's download URL (requires jq)
QUERY="The Great Gatsby"
DOWNLOAD_URL=$(curl -s "http://YOUR_PROXY_IP:3000/api/search?q=${QUERY// /+}" | jq -r '.results[0].downloadUrl')

# Download the file
wget "$DOWNLOAD_URL" -O "book.epub"
```
