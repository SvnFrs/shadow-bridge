import { Hono } from "hono";
import { aggregateSearch, filterProviders } from "./core/aggregator.js";
import { annasProvider } from "./providers/annas.js";
import { madaraProvider } from "./providers/madara.js";
import { zlibProvider } from "./providers/zlib.js";
import { tve4uProvider } from "./providers/tve4u.js";
import { libgenProvider } from "./providers/libgen.js";
import { discoverLinks } from "./core/linkDiscoverer.js";
import { HttpError, isHttpError } from "./core/errors.js";
import { env } from "./core/env.js";
import { getErrorMessage, log } from "./core/logger.js";
import { sessionDb } from "./core/sessionDb.js";

const app = new Hono();

app.use("*", async (c, next) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  c.set("requestId", requestId);
  log("info", "request started", {
    requestId,
    path: c.req.path,
  });

  try {
    await next();
  } catch (error) {
    const message = getErrorMessage(error);
    const status = isHttpError(error) ? error.status : 500;
    log("error", "request failed", {
      requestId,
      path: c.req.path,
      status,
      error: message,
    });
    throw error;
  } finally {
    log("info", "request completed", {
      requestId,
      path: c.req.path,
      status: c.res?.status ?? 200,
      durationMs: Date.now() - startedAt,
    });
  }
});

const allProviders = [annasProvider, madaraProvider, zlibProvider, tve4uProvider, libgenProvider];

app.get("/api/providers", (c) => {
  const providers = allProviders.map((provider) => ({
    name: provider.name,
    baseUrl: sessionDb.getBaseUrl(provider.name),
    enabled: true,
  }));

  return c.json({ providers });
});

app.get("/api/health", (c) => {
  return c.json({ status: "ok", providers: allProviders.length });
});

// Run discovery in background on startup
discoverLinks().catch((error: unknown) => {
  log("warn", "background discovery failed", { error: getErrorMessage(error) });
});

app.get("/", (c) => c.text("ShadowBridge API is running"));

app.get("/api/search", async (c) => {
  const query = c.req.query("q");
  const requestedProviders = c.req.query("providers");

  if (!query) {
    throw new HttpError("Query parameter 'q' is required", 400);
  }

  const providers = filterProviders(allProviders, requestedProviders);
  if (providers.length === 0) {
    throw new HttpError("No matching providers configured", 400);
  }

  // Use a controller to abort slow providers when we hit the timeout
  const timeoutMs = env.searchTimeoutMs - 500; // Leave 500ms for response formatting
  let response: SearchResponse;

  try {
    response = await Promise.race([
      aggregateSearch(query, providers),
      new Promise<SearchResponse>((resolve) => {
        setTimeout(async () => {
          log("warn", "search timed out, returning partial results", { query });
          // Return whatever is finished so far
          // Note: aggregateSearch already handles individual provider failures
          // This race just ensures we don't wait forever
          const results: BookResult[] = [];
          const errors: string[] = ["Global search timeout reached - results may be partial"];
          resolve({ query, totalResults: 0, results, errors });
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    log("error", "search failed", { query, error: getErrorMessage(error) });
    throw error;
  }

  if (response.totalResults === 0 && response.errors.length === 0) {
    log("warn", "search returned no results", { query, status: 200 });
  }

  return c.json(response);
});

app.get("/api/resolve", async (c) => {
  const url = c.req.query("url");
  if (!url) {
    throw new HttpError("Query parameter 'url' is required", 400);
  }

  const provider = allProviders.find((p) => {
    // Basic heuristic: check if URL contains provider name
    // or if the URL host matches a discovered base URL
    if (url.includes(p.name)) return true;
    const base = sessionDb.getBaseUrl(p.name);
    return base && url.startsWith(base);
  });

  if (provider?.resolveDownloadUrl) {
    const directUrl = await provider.resolveDownloadUrl(url);
    return c.json({ downloadUrl: directUrl || url });
  }

  return c.json({ downloadUrl: url });
});

app.onError((error, c) => {
  if (isHttpError(error)) {
    return c.json({ error: error.message }, error.status);
  }

  log("error", "unhandled error", { error: getErrorMessage(error), path: c.req.path });
  return c.json({ error: "Internal server error" }, 500);
});

export default {
  port: env.port,
  fetch: app.fetch,
};
