import type { SearchProvider, SearchResponse, BookResult } from "../types/index.js";
import { getErrorMessage, log } from "./logger.js";

export const aggregateSearch = async (
  query: string,
  providers: SearchProvider[]
): Promise<SearchResponse> => {
  const startedAt = Date.now();
  log("info", "search started", { query, provider: providers.map((p) => p.name).join(",") });

  const settled = await Promise.allSettled(
    providers.map((p) => p.search(query))
  );

  const results: BookResult[] = [];
  const errors: string[] = [];

  settled.forEach((item, index) => {
    const providerName = providers[index].name;
    if (item.status === "fulfilled") {
      results.push(...item.value.results);
      if (item.value.errors) {
        errors.push(...item.value.errors.map(err => `${providerName}: ${err}`));
      }
      log("info", "provider search complete", { provider: providerName, query });
    } else {
      const message = getErrorMessage(item.reason);
      errors.push(`${providerName}: ${message}`);
      log("warn", "provider search failed", { provider: providerName, query, error: message });
    }
  });

  log("info", "search completed", { query, durationMs: Date.now() - startedAt, status: 200 });

  return {
    query,
    totalResults: results.length,
    results,
    errors,
  };
};

export const filterProviders = (
  allProviders: SearchProvider[],
  requested?: string
): SearchProvider[] => {
  if (!requested) return allProviders;
  const allowed = requested.split(",").map((p) => p.trim().toLowerCase());
  return allProviders.filter((p) => allowed.includes(p.name.toLowerCase()));
};
