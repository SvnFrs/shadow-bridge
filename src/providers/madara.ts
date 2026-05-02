import { httpClient } from "../core/httpClient.js";
import { getErrorMessage, log } from "../core/logger.js";
import type { BookResult, ProviderSearchResult, SearchProvider } from "../types/index.js";

const decodeBase64 = (value: string): string => atob(value);

const stableId = (value: string): string => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

export const madaraProvider: SearchProvider = {
  name: "madara",
  async search(query: string): Promise<ProviderSearchResult> {
    try {
      // Madara provider expects a URL. Skip if query is not a valid URL.
      if (!query.startsWith("http")) {
        return { results: [] };
      }

      const response = await httpClient(query);
      const html = await response.text();

      const results: BookResult[] = [];
      const imageLinksRegex = /var\s+imageLinks\s*=\s*\[(.*?)\];/s;
      const match = imageLinksRegex.exec(html);

      if (match && match[1]) {
        const linksStr = match[1];
        const linkRegex = /"([^"]+)"/g;
        let linkMatch: RegExpExecArray | null;
        while ((linkMatch = linkRegex.exec(linksStr)) !== null) {
          const encoded = linkMatch[1];
          if (!encoded) continue;
          try {
            const decoded = decodeBase64(encoded);
            results.push({
              id: stableId(decoded),
              source: "madara",
              title: `Manga Page ${results.length + 1}`,
              author: "Various",
              sizeMb: 0,
              format: "cbz",
              downloadUrl: decoded,
            });
          } catch {
            // If not base64, assume direct link
            results.push({
              id: stableId(encoded),
              source: "madara",
              title: `Manga Page ${results.length + 1}`,
              author: "Various",
              sizeMb: 0,
              format: "cbz",
              downloadUrl: encoded,
            });
          }
        }
      }

      return { results };
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      log("warn", "madara provider error", { provider: "madara", query, error: message });
      return { results: [], errors: [message] };
    }
  },
};
