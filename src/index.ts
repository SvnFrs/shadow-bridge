import { Hono } from "hono";
import { aggregateSearch, filterProviders } from "./core/aggregator.js";
import { annasProvider } from "./providers/annas.js";
import { madaraProvider } from "./providers/madara.js";
import { zlibProvider } from "./providers/zlib.js";
import { tve4uProvider } from "./providers/tve4u.js";
import { discoverLinks } from "./core/linkDiscoverer.js";
import { HttpError, isHttpError } from "./core/errors.js";
import { env } from "./core/env.js";
import { getErrorMessage, log } from "./core/logger.js";

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

const allProviders = [annasProvider, madaraProvider, zlibProvider, tve4uProvider];

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

  const response = await Promise.race([
    aggregateSearch(query, providers),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new HttpError("Search timed out", 504)), env.searchTimeoutMs);
    }),
  ]);

  return c.json(response);
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
