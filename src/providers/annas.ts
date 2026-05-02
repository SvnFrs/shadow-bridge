import { httpClient } from "../core/httpClient.js";
import { env } from "../core/env.js";
import { sessionDb } from "../core/sessionDb.js";
import { getErrorMessage, log } from "../core/logger.js";
import type { BookResult, ProviderSearchResult, SearchProvider } from "../types/index.js";

const ANNAS_MIRRORS = [
  "https://annas-archive.li",
  "https://annas-archive.gl",
  "https://annas-archive.pk",
  "https://annas-archive.gd"
];

export const annasProvider: SearchProvider = {
  name: "annas",
  async search(query: string): Promise<ProviderSearchResult> {
    const discoveredUrl = sessionDb.getBaseUrl("annas");
    const configuredUrl = env.annasBaseUrl;

    const mirrors = [...new Set([
      ...(discoveredUrl ? [discoveredUrl] : []),
      ...(configuredUrl ? [configuredUrl] : []),
      ...ANNAS_MIRRORS,
    ])];

    for (const baseUrl of mirrors) {
      try {
        const searchUrl = `${baseUrl}/search?q=${encodeURIComponent(query)}`;
        const response = await httpClient(searchUrl);
        const html = await response.text();

        const results: BookResult[] = [];
        const cidRegex = /href=["'](?:https?:\/\/[^\/]+\/ipfs\/)?(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58,})["']/g;

        let match: RegExpExecArray | null;
        while ((match = cidRegex.exec(html)) !== null) {
          const cid = match[1];
          if (!cid) continue;
          results.push({
            id: cid,
            source: "annas",
            title: `IPFS Resource (${cid.substring(0, 8)}...)`,
            author: "Unknown",
            sizeMb: 0,
            format: "unknown",
            downloadUrl: `https://dweb.link/ipfs/${cid}`,
          });
        }

        log("info", "annas search completed", { provider: "annas", query });
        return { results };
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        log("warn", "annas search failed", { provider: "annas", query, error: message });
      }
    }

    return { results: [], errors: ["No Anna's Archive mirror responded"] };
  },
};
